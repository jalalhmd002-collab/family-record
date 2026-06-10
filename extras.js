// extras.js - Reports, Import/Export, Settings, Family Tree

// ===== UTILITIES =====

/**
 * Compresses an image using Canvas API
 * @param {File} file 
 * @param {number} maxWidth 
 * @returns {Promise<string>} Base64 string of compressed image
 */
async function compressImage(file, maxWidth = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Use JPEG for better compression
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// ===== IMPORT/EXPORT =====
async function renderImportExport() {
    renderSettings();

async function exportFullBackup() {
    try {
        const backup = await db.exportFullBackup();
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('تم تصدير النسخة الاحتياطية بنجاح');
    } catch (err) {
        showToast('خطأ في التصدير: ' + err.message, 'error');
    }
}

async function handleRestoreFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.json')) { showToast('يرج please choose a JSON file', 'error'); return; }

    if (!confirm('تنبيه: سيتم مسح جميع البيانات الحالية واستبدالها بالبيانات الموجودة في الملف. هل تريد الاستمرار؟')) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const backupData = JSON.parse(e.target.result);
            const results = await db.restoreFullBackup(backupData);
            showToast(`تمت الاستعادة بنجاح! تم استيراد ${results.success} سجلات.`);
            navigate('dashboard');
        } catch (err) {
            showToast('خطأ في الاستيراد: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

async function exportToExcel() {
    const all = await db.getAllMembers();
    const heads = await db.getAllHeads();
    const headMap = {};
    heads.forEach(h => { headMap[h.id] = h.nationalId; });
    const data = all.map(m => ({
        'الاسم': m.fullName, 'رقم الهوية': m.nationalId, 'الجنس': getGenderLabel(m.gender),
        'تاريخ الميلاد': m.birthDate, 'العمر': calculateAge(m.birthDate) !== '' ? calculateAge(m.birthDate) : '',
        'الحالة الاجتماعية': getMaritalLabel(m.maritalStatus),
        'اسم الأم': m.motherName, 'لقب العائلة': m.familyName, 'العنوان': m.address, 'الجوال': m.phone,
        'الدور': getRoleLabel(m.role), 'صلة القرابة': m.relationship,
        'هوية رب الأسرة': headMap[m.familyId] || m.nationalId,
        'تاريخ الوفاة': m.deathDate, 'ملاحظات': m.notes
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الأفراد');
    XLSX.writeFile(wb, 'سجل_العائلة.xlsx');
    showToast('تم تصدير البيانات بنجاح');
}

function downloadTemplate() {
    const template = [{ 'الاسم':'', 'رقم الهوية':'', 'الجنس':'', 'تاريخ الميلاد':'', 'الحالة الاجتماعية':'', 'اسم الأم':'', 'لقب العائلة':'', 'العنوان':'', 'الجوال':'', 'الدور':'', 'صلة القرابة':'', 'هوية رب الأسرة':'', 'تاريخ الوفاة':'', 'ملاحظات':'' }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'نموذج');
    XLSX.writeFile(wb, 'نموذج_السجل.xlsx');
    showToast('تم تحميل النموذج');
}

async function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const wb = XLSX.read(e.target.result, {type:'array'});
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws);
            if (!rows.length) { showToast('الملف فارغ', 'error'); return; }

            const genderMap = {'ذكر':'male','أنثى':'female','انثى':'female','male':'male','female':'female'};
            const maritalMap = {'أعزب':'single','عزباء':'single','أعزب/عزباء':'single','متزوج':'married','متزوجة':'married','متزوج/ة':'married','مطلق':'divorced','مطلقة':'divorced','مطلق/ة':'divorced','أرمل':'widowed','ارملة':'widowed','أرمل/ة':'widowed','منفصل':'separated','منفصلة':'separated','منفصل/ة':'separated'};

            function getCol(r, keys) {
                for (const k of keys) {
                    for (const col of Object.keys(r)) {
                        if (col.includes(k)) return (r[col]||'').toString().trim();
                    }
                }
                return '';
            }

            const headIdMap = {};
            const members = [];

            for (const r of rows) {
                const nationalId = getCol(r, ['رقم الهوية', 'الهوية', 'هوية']).replace(/[^\d]/g,'') || getCol(r, ['رقم الهوية', 'الهوية']);
                const headNatId = getCol(r, ['هوية رب', 'رقم هوية رب', 'هوية الأب', 'هوية الاب', 'رب الأسرة', 'رب الاسرة']);
                const gender = genderMap[getCol(r, ['الجنس', 'جنس'])] || 'male';
                const rawRole = getCol(r, ['الدور', 'دور', 'نوع']);
                const rawRelation = getCol(r, ['صلة القرابة', 'القرابة', 'صلة']);

                let role = 'child';
                let relationship = rawRelation;

                if (rawRole && (rawRole.includes('رب') || rawRole === 'رب أسرة' || rawRole === 'رب اسرة' || rawRole === 'رب الأسرة')) {
                    role = 'head';
                } else if (!headNatId || headNatId === nationalId) {
                    role = 'head';
                }

                if (role === 'child' && !relationship) {
                    if (rawRole && (rawRole.includes('زوج') && !rawRole.includes('متزوج'))) {
                        relationship = 'زوجة';
                    } else if (gender === 'male') {
                        relationship = 'ابن';
                    } else {
                        relationship = 'ابنة';
                    }
                }

                const m = {
                    fullName: getCol(r, ['الاسم', 'اسم']),
                    nationalId: nationalId,
                    gender: gender,
                    birthDate: getCol(r, ['تاريخ الميلاد', 'الميلاد', 'ميلاد']),
                    maritalStatus: maritalMap[getCol(r, ['الحالة الاجتماعية', 'الحالة', 'حالة'])] || '',
                    motherName: getCol(r, ['اسم الأم', 'اسم الام', 'الأم', 'الام']),
                    familyName: getCol(r, ['لقب العائلة', 'اللقب', 'الفرع', 'لقب']),
                    address: getCol(r, ['العنوان', 'عنوان']),
                    phone: getCol(r, ['الجوال', 'الهاتف', 'جوال', 'هاتف', 'رقم الجوال']),
                    deathDate: getCol(r, ['تاريخ الوفاة', 'الوفاة', 'وفاة']),
                    notes: getCol(r, ['ملاحظات', 'ملاحظة']),
                    relationship: relationship,
                    role: role,
                    headNatId: headNatId,
                    photo: ''
                };
                members.push(m);
            }

            const headNatIds = [...new Set(members.filter(m => m.headNatId && m.role === 'child').map(m => m.headNatId))];
            for (const hid of headNatIds) {
                const hasHead = members.some(m => m.role === 'head' && m.nationalId === hid);
                if (!hasHead) {
                    const candidate = members.find(m => m.nationalId === hid);
                    if (candidate) {
                        candidate.role = 'head';
                        candidate.relationship = '';
                    }
                }
            }

            let success = 0, failed = 0, errors = [];

            const allMembers = await db.getAllMembers();
            const existingNatIds = new Set(allMembers.map(m => m.nationalId).filter(Boolean));
            const heads = allMembers.filter(m => m.role === 'head');
            const existingHeadMap = {};
            heads.forEach(h => { if (h.nationalId) existingHeadMap[h.nationalId] = h.id; });

            for (const m of members.filter(x => x.role === 'head')) {
                if (!m.fullName) { failed++; errors.push('سطر بدون اسم'); continue; }
                if (m.nationalId && existingNatIds.has(m.nationalId)) { failed++; errors.push(`${m.fullName}: رقم الهوية موجود مسبقاً`); continue; }
                if (m.nationalId && headIdMap[m.nationalId]) { continue; }
                const id = await db.addMember({...m, familyId: 0});
                await db.updateMember(id, {familyId: id});
                if (m.nationalId) { headIdMap[m.nationalId] = id; existingNatIds.add(m.nationalId); }
                success++;
            }

            for (const m of members.filter(x => x.role !== 'head')) {
                if (!m.fullName) { failed++; errors.push('سطر بدون اسم'); continue; }
                let fId = headIdMap[m.headNatId];
                if (!fId && m.headNatId && existingHeadMap[m.headNatId]) {
                    fId = existingHeadMap[m.headNatId];
                }
                if (!fId) { failed++; errors.push(`${m.fullName}: رب الأسرة غير موجود (هوية: ${m.headNatId})`); continue; }
                if (m.nationalId && existingNatIds.has(m.nationalId) && m.nationalId !== m.headNatId) { failed++; errors.push(`${m.fullName}: رقم الهوية موجود مسبقاً`); continue; }
                await db.addMember({...m, familyId: fId});
                if (m.nationalId && m.nationalId !== m.headNatId) existingNatIds.add(m.nationalId);
                success++;
            }

            document.getElementById('importResults').innerHTML = `
                <div class="card"><h4 style="margin-bottom:8px">نتيجة الاستيراد</h4>
                <p style="color:var(--success)">✅ نجح: ${success}</p>
                ${failed?`<p style="color:var(--danger)">❌ فشل: ${failed}</p><ul style="color:var(--text-muted);font-size:13px;margin-top:8px">${errors.slice(0,10).map(e=>`<li>${e}</li>`).join('')}</ul>`:''}</div>`;
            showToast(`تم استيراد ${success} سجل`);
        } catch (err) { showToast('خطأ في قراءة الملف: ' + err.message, 'error'); }
    };
    reader.readAsArrayBuffer(file);
}

// ===== SETTINGS =====
async function renderSettings() {
    document.getElementById('mainContent').innerHTML = `
        <div class="card" style="max-width: 700px; margin: 0 auto;">
            <div class="card-header" style="padding: 12px 16px; border-bottom: 1px solid #eee; margin-bottom: 20px;">
                <h3 style="font-size: 16px; margin: 0; color: var(--text-color);"><i class="fas fa-cog"></i> إعدادات النظام</h3>
            </div>
            
            <div style="padding: 0 16px 16px 16px; display: flex; gap: 20px; flex-wrap: wrap;">
                <!-- بطاقة تصدير النسخة الاحتياطية JSON -->
                <div style="flex: 1; min-width: 280px; border: 1px solid #eee; border-radius: 8px; padding: 16px; background: #fff; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <i class="fas fa-database" style="font-size: 24px; color: #673ab7; margin-bottom: 12px;"></i>
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">نسخة احتياطية كاملة</h4>
                    <p style="margin: 0 0 16px 0; font-size: 12px; color: #777; line-height: 1.6;">تصدير كافة بيانات السجل العائلي والصور والمرفقات في ملف JSON واحد للاتفاظ بها.</p>
                    <button type="button" class="btn" onclick="exportFullBackupJSON()" style="background: #673ab7; color: #fff; padding: 8px 16px; font-size: 13px; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-file-download"></i> تصدير JSON
                    </button>
                </div>

                <!-- بطاقة استعادة النسخة الاحتياطية JSON -->
                <div style="flex: 1; min-width: 280px; border: 1px solid #eee; border-radius: 8px; padding: 16px; background: #fff; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <i class="fas fa-history" style="font-size: 24px; color: #e53935; margin-bottom: 12px;"></i>
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">استعادة النظام بالكامل</h4>
                    <p style="margin: 0 0 16px 0; font-size: 12px; color: #777; line-height: 1.6;">رفع ملف نسخة احتياطية سابقة لاستعادة كافة البيانات (سيتم استبدال البيانات الحالية).</p>
                    <button type="button" class="btn" onclick="importFullBackupJSON()" style="background: #e53935; color: #fff; padding: 8px 16px; font-size: 13px; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-file-upload"></i> استعادة الملف
                    </button>
                </div>
            </div>
        </div>
    `;
}

// دالة تصدير البيانات الكاملة بصيغة JSON
window.exportFullBackupJSON = async function() {
    try {
        const members = await db.getAllMembers();
        const heads = await db.getAllHeads ? await db.getAllHeads() : [];
        
        // تجميع كل البيانات في كائن واحد مخصص للنسخ الاحتياطي
        const backupData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            members: members,
            heads: heads
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `نسخة_احتياطية_السجل_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.removeChild(downloadAnchor);
        
        showToast('تم تصدير النسخة الاحتياطية بنجاح');
    } catch (err) {
        showToast('حدث خطأ أثناء تصدير البيانات: ' + err.message, 'error');
    }
};

// دالة استيراد واستعادة البيانات الكاملة من ملف JSON
window.importFullBackupJSON = function() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!confirm('تنبيه هام جداً: استعادة الملف ستقوم بمسح البيانات الحالية تماماً واستبدالها بالنسخة الاحتياطية، هل أنت متأكد؟')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const parsedData = JSON.parse(event.target.result);
                
                // فحص بسيط للتأكد من أن الملف المرفوع هو ملف السجل العائلي الفعلي
                if (!parsedData.members) {
                    showToast('ملف غير صالح أو لا يحتوي على بيانات السجل العائلي', 'error');
                    return;
                }

                // مسح قاعدة البيانات الحالية وتخزين البيانات الجديدة من الملف المرفوع
                if (db.clearAllData) {
                    await db.clearAllData();
                }
                
                // حفظ أفراد العائلة الجدد
                for (const member of parsedData.members) {
                    await db.addMember ? await db.addMember(member) : await db.updateMember(member.id, member);
                }
                
                showToast('تمت استعادة السجل العائلي بنجاح بالكامل!');
                if (typeof navigate === 'function') navigate('dashboard');
            } catch (err) {
                showToast('فشل قراءة الملف، تأكد من أنه ملف JSON سليم', 'error');
            }
        };
        reader.readAsText(file);
    };
    fileInput.click();
};
// دالة معالجة رفع وثيقة جديدة وحفظها بتصميم مطابق تماماً لنافذة التأكيد الداكنة
window.openAddDocumentModal = async function(memberId, familyId, role) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const existingModal = document.getElementById('customPromptModal');
        if (existingModal) existingModal.remove();

        // بناء النافذة المنبثقة بالهوية البصرية الداكنة والفخمة للبرنامج
        const modalContainer = document.createElement('div');
        modalContainer.id = 'customPromptModal';
        modalContainer.style = "position:fixed; z-index:99999; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); font-family:inherit;";
        
        modalContainer.innerHTML = `
            <div style="width:100%; max-width:440px; border-radius:12px; background:#181824; overflow:hidden; box-shadow:0 15px 35px rgba(0,0,0,0.4); border: 1px solid #28283c; animation: fadeIn 0.2s ease; padding: 24px;">
                <!-- الرأس مع زر الإغلاق X -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <span style="color:#ffffff; font-size:16px; font-weight:bold;"><i class="fas fa-file-signature" style="color: #4facfe; margin-left: 6px;"></i> تسمية الوثيقة المرفوعة</span>
                    <button type="button" id="xCloseCustomDoc" style="background:none; border:none; color:#777db2; font-size:18px; cursor:pointer; padding:0; line-height:1;">&times;</button>
                </div>
                
                <!-- محتوى الإدخال -->
                <div style="margin-bottom: 24px;">
                    <label style="display:block; margin-bottom:12px; font-size:13px; color:#a0a5d1; line-height: 1.5; text-align: right;">الرجاء إدخال اسم أو نوع الوثيقة ليتم حفظها في ملف العضو (مثال: الهوية الوطنية، شهادة الميلاد):</label>
                    <input type="text" id="customDocNameInput" placeholder="اكتب اسم الوثيقة هنا..." style="width:100%; padding:10px 14px; font-size:13px; border:1px solid #2e2e48; border-radius:6px; box-sizing:border-box; background:#11111a; color:#ffffff; outline:none; text-align: right;" autofocus>
                </div>
                
                <!-- أزرار التحكم السفلي بالنظام الداكن -->
                <div style="display:flex; justify-content:flex-end; gap:12px;">
                    <button type="button" id="btnCancelCustomDoc" style="background:none; border:none; color:#a0a5d1; padding:10px 20px; font-size:13px; font-weight:bold; cursor:pointer; border-radius:6px;">إلغاء</button>
                    <button type="button" id="btnConfirmCustomDoc" style="background:#4facfe; border:none; color:#ffffff; padding:10px 24px; font-size:13px; font-weight:bold; cursor:pointer; border-radius:6px; box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);">تأكيد الحفظ</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalContainer);

        const inputField = document.getElementById('customDocNameInput');
        const btnConfirm = document.getElementById('btnConfirmCustomDoc');
        const btnCancel = document.getElementById('btnCancelCustomDoc');
        const xClose = document.getElementById('xCloseCustomDoc');

        const processUpload = async () => {
            const docName = inputField.value.trim();
            if (!docName) {
                showToast('يجب إدخال اسم للوثيقة لرفعها', 'error');
                inputField.focus();
                return;
            }

            modalContainer.remove();

            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64Data = event.target.result;
                const member = await db.getMember(memberId);
                if (member) {
                    if (!member.documents) member.documents = [];
                    member.documents.push({
                        name: docName,
                        base64: base64Data
                    });
                    
                    await db.updateMember(memberId, { documents: member.documents });
                    showToast('تم رفع وحفظ الوثيقة بنجاح');
                    if (typeof renderMemberDocuments === 'function') {
                        renderMemberDocuments(memberId, familyId, role);
                    }
                }
            };
            reader.readAsDataURL(files);
        };

        btnConfirm.onclick = processUpload;
        btnCancel.onclick = () => modalContainer.remove();
        xClose.onclick = () => modalContainer.remove();
        inputField.onkeydown = (event) => {
            if (event.key === 'Enter') processUpload();
            if (event.key === 'Escape') modalContainer.remove();
        };
    };
    
    fileInput.click();
};
