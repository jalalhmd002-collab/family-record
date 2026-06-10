// pages.js - All page renderers

// ===== MEMBER FORM =====
async function renderMemberForm(params) {
    let member = {};
    let isEdit = false;
    if (params.memberId) { member = await db.getMember(params.memberId) || {}; isEdit = true; }
    const role = member.role || params.role || 'head';
    const familyId = member.familyId || params.familyId || null;

    if (!isEdit && role !== 'head' && familyId) {
        const familyMembers = await db.getFamilyMembers(familyId);
        const head = familyMembers.find(m => m.role === 'head');
        if (head) {
            member.familyName = head.familyName;
        }
    }

    const knownRelations = ['زوجة','ابن','ابنة','أخ','أخت','أب','أم','جد','جدة'];
    const relationOptions = role === 'child' ? `
        <div class="form-group" style="margin-bottom:10px"><label>صلة القرابة</label>
            <select id="fRelation" onchange="toggleCustomRelation(this)" style="padding:8px 12px;font-size:13px">
                <option value="">اختر</option>
                <option value="زوجة" ${member.relationship==='زوجة'?'selected':''}>زوجة</option>
                <option value="ابن" ${member.relationship==='ابن'?'selected':''}>ابن</option>
                <option value="ابنة" ${member.relationship==='ابنة'?'selected':''}>ابنة</option>
                <option value="أخ" ${member.relationship==='أخ'?'selected':''}>أخ</option>
                <option value="أخت" ${member.relationship==='أخت'?'selected':''}>أخت</option>
                <option value="أب" ${member.relationship==='أب'?'selected':''}>أب</option>
                <option value="أم" ${member.relationship==='أم'?'selected':''}>أم</option>
                <option value="جد" ${member.relationship==='جد'?'selected':''}>جد</option>
                <option value="جدة" ${member.relationship==='جدة'?'selected':''}>جدة</option>
                <option value="other" ${member.relationship && !knownRelations.includes(member.relationship)?'selected':''}>أخرى</option>
            </select>
        </div>
        <div class="form-group" id="customRelationGroup" style="${member.relationship && !knownRelations.includes(member.relationship) && member.relationship?'':'display:none'};margin-bottom:10px">
            <label>حدد صلة القرابة</label>
            <input type="text" id="fRelationCustom" value="${member.relationship && !knownRelations.includes(member.relationship)?member.relationship:''}" placeholder="اكتب صلة القرابة..." style="padding:8px 12px;font-size:13px">
        </div>` : role === 'head' ? `
        <div class="form-group" style="margin-bottom:10px"><label>صلة القرابة</label>
            <input type="text" id="fRelation" value="${member.relationship||''}" placeholder="مثال: زوج، أخ..." style="padding:8px 12px;font-size:13px">
        </div>` : '';

    document.getElementById('mainContent').innerHTML = `
        <div class="card" style="max-width:600px">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #eee; margin-bottom:16px">
                <h3 style="font-size:16px;margin:0"><i class="fas fa-user-edit"></i> ${isEdit?'تعديل':'إضافة'} ${getRoleLabel(role)}</h3>
                <div class="btn-group">
                    <button type="button" class="btn btn-outline btn-sm" onclick="renderMemberDocuments(${member.id || 0}, ${familyId || 0}, '${role}')">الوثائق</button>
                    <button type="submit" form="memberForm" class="btn btn-primary btn-sm"><i class="fas fa-save"></i> حفظ</button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="navigate(${familyId?`'family-detail',{headId:${familyId}}`:`'dashboard'`})">إلغاء</button>
                </div>
            </div>

            <form id="memberForm" style="padding:0 16px 16px 16px">
                <div class="form-group"><label>الاسم الكامل *</label><input type="text" id="fName" value="${member.fullName||''}" required style="padding:8px 12px;font-size:13px"></div>
                <div class="form-row" style="gap:10px">
                    <div class="form-group" style="flex:1"><label>رقم الهوية</label><input type="text" id="fNatId" value="${member.nationalId||''}" style="padding:8px 12px;font-size:13px"></div>
                    <div class="form-group" style="flex:1"><label>الجنس *</label><select id="fGender" required style="padding:8px 12px;font-size:13px"><option value="">اختر</option><option value="male" ${member.gender==='male'?'selected':''}>ذكر</option><option value="female" ${member.gender==='female'?'selected':''}>أنثى</option></select></div>
                </div>
                <div class="form-row" style="gap:10px">
                    <div class="form-group" style="flex:1"><label>تاريخ الميلاد</label><input type="date" id="fBirth" value="${member.birthDate||''}" style="padding:8px 12px;font-size:13px"></div>
                    <div class="form-group" style="flex:1"><label>العمر</label><input type="text" id="fAge" value="${calculateAge(member.birthDate)}" readonly style="padding:8px 12px;font-size:13px"></div>
                </div>
                <div class="form-row" style="gap:10px">
                    <div class="form-group" style="flex:1"><label>الحالة الاجتماعية</label><select id="fMarital" style="padding:8px 12px;font-size:13px"><option value="">اختر</option><option value="single" ${member.maritalStatus==='single'?'selected':''}>أعزب/عزباء</option><option value="married" ${member.maritalStatus==='married'?'selected':''}>متزوج/ة</option><option value="divorced" ${member.maritalStatus==='divorced'?'selected':''}>مطلق/ة</option><option value="widowed" ${member.maritalStatus==='widowed'?'selected':''}>أرمل/ة</option><option value="separated" ${member.maritalStatus==='separated'?'selected':''}>منفصل/ة</option></select></div>
                    <div class="form-group" style="flex:1">${relationOptions}</div>
                </div>
                <div class="form-group"><label>اسم الأم</label><input type="text" id="fMother" value="${member.motherName||''}" style="padding:8px 12px;font-size:13px"></div>
                <div class="form-row" style="gap:10px">
                    <div class="form-group" style="flex:1"><label>رقم الهاتف</label><input type="text" id="fPhone" value="${member.phone||''}" style="padding:8px 12px;font-size:13px"></div>
                    <div class="form-group" style="flex:1"><label>رقم الهاتف البديل</label><input type="text" id="fAltPhone" value="${member.altPhone||''}" style="padding:8px 12px;font-size:13px"></div>
                </div>
                <div class="form-group"><label>العنوان</label><input type="text" id="fAddress" value="${member.address||''}" style="padding:8px 12px;font-size:13px"></div>
                
                <div class="form-group"><label>العنوان</label><input type="text" id="fAddress" value="${member.address||''}" style="padding:8px 12px;font-size:13px"></div>
                <div class="form-group"><label>ملاحظات</label><textarea id="fNotes" style="padding:8px 12px;font-size:13px;min-height:60px">${member.notes||''}</textarea></div>
            </form>
        </div>`;

    // حساب العمر تلقائياً عند تغيير التاريخ
    document.getElementById('fBirth').addEventListener('change', (e) => {
        document.getElementById('fAge').value = calculateAge(e.target.value);
    });

    // Form submit
    document.getElementById('memberForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        let relationship = '';
        if (role === 'child') {
            const sel = document.getElementById('fRelation');
            relationship = sel.value === 'other' ? (document.getElementById('fRelationCustom')?.value.trim()||'') : sel.value;
            
            if (relationship) {
                const gender = document.getElementById('fGender').value;
                const genderMap = {
                    'زوجة': 'female', 'ابن': 'male', 'ابنة': 'female', 'أخ': 'male', 'أخت': 'female',
                    'أب': 'male', 'أم': 'female', 'جد': 'male', 'جدة': 'female'
                };
                if (genderMap[relationship] && gender && gender !== genderMap[relationship]) {
                    showToast(`صلة القرابة "${relationship}" لا تتوافق مع الجنس المختار`, 'error');
                    return;
                }
                if (['أب','أم','جد','جدة'].includes(relationship)) {
                    showToast('لا يمكن أن يكون العضو من أصول رب الأسرة', 'error');
                    return;
                }
            }
        } else if (role === 'head') {
            relationship = document.getElementById('fRelation')?.value.trim() || '';
        }

        const data = {
            fullName: document.getElementById('fName').value.trim(),
familyName: document.getElementById('fFamilyName')?.value?.trim() || '',
            nationalId: document.getElementById('fNatId').value.trim(),
            gender: document.getElementById('fGender').value,
            birthDate: document.getElementById('fBirth').value,
            maritalStatus: document.getElementById('fMarital').value,
            motherName: document.getElementById('fMother').value.trim(),
            phone: document.getElementById('fPhone').value.trim(),
            altPhone: document.getElementById('fAltPhone').value.trim(),
            address: document.getElementById('fAddress').value.trim(),
            relationship: relationship,
            role: role,
            notes: document.getElementById('fNotes').value.trim(),
            documents: member.documents || [],
            photo: member.photo || ''
        };

        if (data.nationalId) {
            const exists = await db.isNationalIdExists(data.nationalId, isEdit ? member.id : null);
            if (exists) { showToast('رقم الهوية موجود مسبقاً', 'error'); return; }
        }

        try {
            let targetId = null;
            if (isEdit) {
                await db.updateMember(member.id, data);
                showToast('تم التحديث بنجاح');
                targetId = familyId;
            } else {
                if (role === 'head') {
                    const newId = await db.addMember({...data, familyId: 0});
                    await db.updateMember(newId, {familyId: newId});
                    showToast('تمت الإضافة بنجاح');
                    targetId = newId;
                } else {
                    await db.addMember({...data, familyId: familyId});
                    showToast('تمت الإضافة بنجاح');
                    targetId = familyId;
                }
            }

            if (targetId) {
                navigate('family-detail', { headId: targetId });
            } else {
                navigate('dashboard');
            }
        } catch(err) { showToast('حدث خطأ: ' + err.message, 'error'); }
    });
}

// ===== DOCUMENTS VIEW =====
async function renderMemberDocuments(memberId, familyId, role) {
    const member = await db.getMember(memberId);
    if (!member) { showToast('العضو غير موجود', 'error'); return; }

    const docs = member.documents || [];

    let docsHtml = '';
    if (docs.length === 0) {
        docsHtml = `<div style="text-align:center; color:#888; padding:30px; font-size:14px;"><i class="fas fa-folder-open" style="font-size:24px; margin-bottom:10px; display:block;"></i> لا توجد وثائق مرفوعة لهذا العضو حالياً</div>`;
    } else {
        docsHtml = `<div style="display:flex; flex-wrap:wrap; gap:16px; padding:10px 0;">`;
        docs.forEach((doc, index) => {
            docsHtml += `
                <div class="card" style="flex: 1 1 calc(50% - 16px); min-width:250px; background:#fff; border:1px solid #eee; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 2px 5px rgba(0,0,0,0.05)">
                    <!-- عنوان الوثيقة -->
                    <div style="padding:10px 12px; background:#f9f9f9; border-bottom:1px solid #eee; font-weight:bold; font-size:13px; color:#333; text-align:right;">
                        ${doc.name || 'وثيقة بدون اسم'}
                    </div>
                    
                    <!-- منطقة المعاينة بحجم مريح وقابل للضغط -->
                    <div style="flex:1; display:flex; align-items:center; justify-content:center; background:#f5f5f5; height:180px; padding:10px; cursor:pointer;" onclick="viewDocumentModal('${doc.base64 || doc.url}')" title="اضغط لتكبير الوثيقة">
                        <img src="${doc.base64 || doc.url}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.1)">
                    </div>
                    
                    <!-- أزرار التحكم السفلي -->
                    <div style="display:flex; border-top:1px solid #eee; background:#fff;">
                        <a href="${doc.base64 || doc.url}" download="${doc.name || 'وثيقة'}" class="btn" style="flex:1; text-align:center; padding:10px; font-size:13px; color:#2196F3; border-radius:0; border:none; border-left:1px solid #eee; margin:0; background:none;">
                            <i class="fas fa-download"></i> حفظ بالجهاز
                        </a>
                        <button type="button" class="btn" onclick="deleteDocumentByIndex(${memberId}, ${index}, ${familyId}, '${role}')" style="flex:1; padding:10px; font-size:13px; color:#e53935; border-radius:0; border:none; margin:0; background:none;">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `;
        });
        docsHtml += `</div>`;
    }

    document.getElementById('mainContent').innerHTML = `
        <div class="card" style="max-width:700px; margin: 0 auto;">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #eee; margin-bottom:16px">
                <h3 style="font-size:16px; margin:0;"><i class="fas fa-file-alt"></i> إدارة الوثائق - ${member.fullName}</h3>
                <div class="btn-group">
                    <button type="button" class="btn btn-primary btn-sm" onclick="openAddDocumentModal(${memberId}, ${familyId}, '${role}')"><i class="fas fa-plus"></i> إضافة وثيقة جديدة</button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="navigate('family-detail', {headId: ${familyId}})">رجوع</button>
                </div>
            </div>
            <div style="padding:0 16px 16px 16px">
                ${docsHtml}
            </div>
        </div>
        
        <!-- النافذة المنبثقة للتكبير الفوري -->
        <div id="docPreviewModal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.8); align-items:center; justify-content:center;" onclick="this.style.display='none'">
            <div style="position:relative; max-width:90%; max-height:90%;">
                <span style="position:absolute; top:-40px; right:0; color:#fff; font-size:30px; font-weight:bold; cursor:pointer;">&times;</span>
                <img id="modalTargetImage" src="" style="max-width:100%; max-height:85vh; object-fit:contain; border-radius:4px; border:3px solid #fff;">
            </div>
        </div>
    `;
}

// دالة تشغيل النافذة المنبثقة لرؤية الصورة بحجمها الكامل
function viewDocumentModal(imgSrc) {
    const modal = document.getElementById('docPreviewModal');
    const modalImg = document.getElementById('modalTargetImage');
    modalImg.src = imgSrc;
    modal.style.display = 'flex';
}

// دالة حذف الوثيقة من قاعدة البيانات مباشرة وتحديث الشاشة
async function deleteDocumentByIndex(memberId, index, familyId, role) {
    if (confirm('هل أنت متأكد من حذف هذه الوثيقة نهائياً؟')) {
        const member = await db.getMember(memberId);
        if (member && member.documents) {
            member.documents.splice(index, 1);
            await db.updateMember(memberId, { documents: member.documents });
            showToast('تم حذف الوثيقة بنجاح');
            renderMemberDocuments(memberId, familyId, role);
        }
    }
}

window.handleDocImageUpload = function(input, rowId) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const row = input.closest('.doc-row');
        const wrapper = row.querySelector('.doc-img-wrapper');
        wrapper.innerHTML = `<img src="${e.target.result}" class="doc-preview" style="width:50px;height:50px;object-fit:cover;border-radius:4px;"><input type="file" id="input_${rowId}" style="display:none" accept="image/*" onchange="handleDocImageUpload(this, '${rowId}')">`;
    };
    reader.readAsDataURL(file);
};

// دالة معالجة رفع وثيقة جديدة وحفظها تلقائياً في قاعدة البيانات
window.openAddDocumentModal = async function(memberId, familyId, role) {
    // إنشاء عنصر رفع ملفات مخفي لتسهيل العملية على المستخدم
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const docName = prompt('الرجاء إدخال اسم أو نوع الوثيقة (مثال: الهوية الوطنية، شهادة الميلاد):');
        if (!docName || !docName.trim()) {
            showToast('يجب إدخال اسم للوثيقة لرفعها', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Data = event.target.result;
            
            // جلب بيانات العضو وتحديث مصفوفة وثائقه
            const member = await db.getMember(memberId);
            if (member) {
                if (!member.documents) member.documents = [];
                member.documents.push({
                    name: docName.trim(),
                    base64: base64Data
                });
                
                await db.updateMember(memberId, { documents: member.documents });
                showToast('تم رفع وحفظ الوثيقة بنجاح');
                
                // إعادة تحديث الشاشة لرؤية البطاقة الجديدة فوراً
                renderMemberDocuments(memberId, familyId, role);
            }
        };
        reader.readAsDataURL(files[0]);
    };
    
    fileInput.click();
};

function toggleCustomRelation(sel) {
    const g = document.getElementById('customRelationGroup');
    g.style.display = sel.value === 'other' ? '' : 'none';
}

// ===== ALL MEMBERS (with filters and search) =====
async function renderAllMembers() {
    const all = await db.getAllMembers();
    const heads = await db.getAllHeads();

    // Group by family, sort members by age within each family
    let grouped = [];
    for (const h of heads) {
        grouped.push(h);
        const familyMembers = all.filter(m => m.familyId === h.id && m.role !== 'head')
            .sort((a, b) => sortByAge(a, b));
        grouped.push(...familyMembers);
    }
    // Orphan members
    const allIds = grouped.map(m => m.id);
    const orphans = all.filter(m => !allIds.includes(m.id));
    grouped.push(...orphans);

    window._allMembersData = grouped;

    let html = `<div class="section"><div class="section-header"><h3 class="section-title"><i class="fas fa-users"></i> جميع الأفراد (${all.length})</h3></div>
        <h3 class="print-header">قائمة جميع الأفراد</h3>
        <div class="btn-group no-print" style="margin-bottom:12px">
            <button class="btn btn-primary btn-sm" onclick="navigate('add-member',{role:'head'})"><i class="fas fa-plus"></i> إضافة أسرة</button>
            <button class="btn btn-success btn-sm" id="btnExport" style="display:none" onclick="exportSelectedToExcel()"><i class="fas fa-file-excel"></i> تصدير</button>
            <button class="btn btn-info btn-sm" id="btnPrint" style="display:none" onclick="printSelected()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-danger btn-sm" id="btnDelete" style="display:none" onclick="deleteSelected()"><i class="fas fa-trash"></i> حذف المحدد</button>
            <span class="filter-count" id="selectedCount" style="display:none"></span>
        </div>
        <div class="filter-bar no-print">
            <div class="filter-group" style="flex:2;min-width:180px"><label>بحث</label><input type="text" id="filterSearch" placeholder="ابحث بالاسم أو الهوية..." oninput="applyFilters()"></div>
            <div class="filter-group" style="flex:1;min-width:80px"><label>العمر من</label><input type="number" id="filterAgeFrom" min="0" placeholder="من" oninput="applyFilters()"></div>
            <div class="filter-group" style="flex:1;min-width:80px"><label>إلى</label><input type="number" id="filterAgeTo" min="0" placeholder="إلى" oninput="applyFilters()"></div>
            <div class="filter-group"><label>الحالة الاجتماعية</label>
                <select id="filterMarital" onchange="applyFilters()"><option value="">الكل</option><option value="single">أعزب/عزباء</option><option value="married">متزوج/ة</option><option value="divorced">مطلق/ة</option><option value="widowed">أرمل/ة</option><option value="separated">منفصل/ة</option></select>
            </div>
            <div class="filter-group"><label>الجنس</label>
                <select id="filterGender" onchange="applyFilters()"><option value="">الكل</option><option value="male">ذكر</option><option value="female">أنثى</option></select>
            </div>
            <button class="btn btn-outline btn-sm" onclick="resetFilters()" style="align-self:flex-end"><i class="fas fa-times"></i> إعادة ضبط</button>
        </div>
        <div id="membersTableContainer"></div>
    </div>`;

    document.getElementById('mainContent').innerHTML = html;
    applyFilters();
}

function applyFilters() {
    const data = window._allMembersData || [];
    const search = document.getElementById('filterSearch')?.value.trim().toLowerCase() || '';
    const ageFromVal = document.getElementById('filterAgeFrom')?.value;
    const ageToVal = document.getElementById('filterAgeTo')?.value;
    const ageFrom = ageFromVal !== '' && ageFromVal !== undefined ? parseInt(ageFromVal) : null;
    const ageTo = ageToVal !== '' && ageToVal !== undefined ? parseInt(ageToVal) : null;
    const marital = document.getElementById('filterMarital')?.value || '';
    const gender = document.getElementById('filterGender')?.value || '';
    const hasAgeFilter = ageFrom !== null || ageTo !== null;

    const filtered = data.filter(m => {
        const age = calculateAge(m.birthDate);
        if (search) {
            const matchName = m.fullName && m.fullName.toLowerCase().includes(search);
            const matchNatId = m.nationalId && m.nationalId.includes(search);
            const matchPhone = m.phone && m.phone.includes(search);
            if (!matchName && !matchNatId && !matchPhone) return false;
        }
        if (hasAgeFilter) {
            if (age === '') return false;
            if (ageFrom !== null && age < ageFrom) return false;
            if (ageTo !== null && age > ageTo) return false;
        }
        if (marital && m.maritalStatus !== marital) return false;
        if (gender && m.gender !== gender) return false;
        return true;
    });

    window._filteredData = filtered;

    let html = '';
    if (!filtered.length) {
        html = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>لا يوجد أفراد</h3></div>';
    } else {
        html += `<p class="filter-count no-print" style="color:var(--text-muted);margin-bottom:10px">عرض ${filtered.length} من ${data.length} فرد</p>`;
        html += '<div class="table-wrapper"><table><thead><tr><th style="width:40px"><input type="checkbox" id="selectAll" onchange="toggleSelectAll()"></th><th>الاسم</th><th>الهوية</th><th>صلة القرابة</th><th>الميلاد</th><th>الحالة</th><th>الفرع</th><th>الجوال</th></tr></thead><tbody>';
        for (const m of filtered) {
            let rowClass = 'member-row';
            if (m.role === 'head') rowClass += ' row-head';
            else if (m.relationship === 'زوجة') rowClass += ' row-wife';
            else rowClass += ' row-child';
            
            const clickAction = m.role==='head'?`navigate('family-detail',{headId:${m.id}})`:`navigate('edit-member',{memberId:${m.id}})`;
            const nameDisplay = m.role === 'head' ? `<span class="badge badge-primary" style="margin-left:6px;font-size:10px">رب أسرة</span>${m.fullName}` : 
                (m.relationship === 'زوجة' ? `<span class="badge" style="margin-left:6px;font-size:10px;background:rgba(139,92,146,0.15);color:var(--accent)">زوجة</span>${m.fullName}` : 
                `<span class="badge" style="margin-left:6px;font-size:10px;background:rgba(16,185,129,0.15);color:var(--success)">فرد</span>${m.fullName}`);
            html += `<tr style="cursor:pointer" class="${rowClass}" onclick="handleRowClick(event,${m.id},'${m.role}')">
                <td data-label=""><input type="checkbox" class="member-checkbox" data-id="${m.id}" onchange="updateSelectedActions()"></td>
                <td data-label="الاسم">${nameDisplay}</td>
                <td data-label="الهوية">${m.nationalId||'-'}</td>
                <td data-label="صلة">${m.relationship||'-'}</td>
                <td data-label="الميلاد">${formatDate(m.birthDate)}</td>
                <td data-label="الحالة">${getMaritalLabel(m.maritalStatus)}</td>
                <td data-label="الفرع">${m.familyName||'-'}</td>
                <td data-label="الجوال">${m.phone||'-'}</td></tr>`;
        }
        html += '</tbody></table></div>';
    }

    document.getElementById('membersTableContainer').innerHTML = html;
}

function resetFilters() {
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterAgeFrom').value = '';
    document.getElementById('filterAgeTo').value = '';
    document.getElementById('filterMarital').value = '';
    document.getElementById('filterGender').value = '';
    applyFilters();
}

// ===== SELECTED ACTIONS =====
function toggleSelectAll() {
    const checked = document.getElementById('selectAll').checked;
    document.querySelectorAll('.member-checkbox').forEach(cb => cb.checked = checked);
    updateSelectedActions();
}

function updateSelectedActions() {
    const checked = document.querySelectorAll('.member-checkbox:checked');
    const btnExport = document.getElementById('btnExport');
    const btnPrint = document.getElementById('btnPrint');
    const btnDelete = document.getElementById('btnDelete');
    const count = document.getElementById('selectedCount');
    if (checked.length > 0) {
        btnExport.style.display = '';
        btnPrint.style.display = '';
        btnDelete.style.display = '';
        count.style.display = '';
        count.textContent = `${checked.length} محدد`;
    } else {
        btnExport.style.display = 'none';
        btnPrint.style.display = 'none';
        btnDelete.style.display = 'none';
        count.style.display = 'none';
    }
}

async function getSelectedMembers() {
    const checked = document.querySelectorAll('.member-checkbox:checked');
    const ids = [...checked].map(cb => parseInt(cb.dataset.id));
    const all = await db.getAllMembers();
    return all.filter(m => ids.includes(m.id));
}

async function exportSelectedToExcel() {
    const selected = await getSelectedMembers();
    if (!selected.length) { showToast('لم يتم تحديد أفراد', 'warning'); return; }

    const heads = await db.getAllHeads();
    const headMap = {};
    heads.forEach(h => { headMap[h.id] = h.nationalId; });
    const data = selected.map(m => ({
        'الاسم': m.fullName, 'رقم الهوية': m.nationalId, 'الجنس': getGenderLabel(m.gender),
        'تاريخ الميلاد': m.birthDate, 'العمر': calculateAge(m.birthDate) !== '' ? calculateAge(m.birthDate) : '',
        'الحالة الاجتماعية': getMaritalLabel(m.maritalStatus), 'اسم الأم': m.motherName,
        'لقب العائلة': m.familyName, 'العنوان': m.address, 'الجوال': m.phone,
        'الدور': getRoleLabel(m.role), 'صلة القرابة': m.relationship,
        'هوية رب الأسرة': headMap[m.familyId] || m.nationalId,
        'تاريخ الوفاة': m.deathDate, 'ملاحظات': m.notes
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الأفراد');
    XLSX.writeFile(wb, 'سجل_العائلة_محدد.xlsx');
    showToast('تم تصدير المحدد');
}

async function printSelected() {
    const checked = document.querySelectorAll('.member-checkbox:checked');
    if (!checked.length) { showToast('لم يتم تحديد أفراد', 'warning'); return; }
    const ids = [...checked].map(cb => parseInt(cb.dataset.id));
    const countEl = document.getElementById('selectedCount');
    const origText = countEl ? countEl.textContent : '';
    if (countEl) countEl.textContent = `(${checked.length} فرد)`;
    document.querySelectorAll('.member-row').forEach(tr => {
        const cb = tr.querySelector('.member-checkbox');
        if (cb && ids.includes(parseInt(cb.dataset.id))) {
            tr.classList.add('print-selected');
        }
    });
    window.print();
    setTimeout(() => {
        document.querySelectorAll('.print-selected').forEach(tr => tr.classList.remove('print-selected'));
        if (countEl) countEl.textContent = origText;
    }, 1000);
}

async function deleteSelected() {
    const selected = await getSelectedMembers();
    if (!selected.length) { showToast('لم يتم تحديد أفراد', 'warning'); return; }

    showModal('تأكيد الحذف', `<p>هل أنت متأكد من حذف ${selected.length} فرد؟</p>`,
        `<button class="btn btn-danger" onclick="doDeleteSelected()">نعم، احذف</button><button class="btn btn-outline" onclick="closeModal()">إلغاء</button>`);
}

async function doDeleteSelected() {
    const selected = await getSelectedMembers();
    for (const m of selected) {
        await db.deleteMember(m.id);
    }
    closeModal();
    showToast(`تم حذف ${selected.length} فرد`);
    renderAllMembers();
}

// ===== FAMILY DETAIL VIEW =====
async function renderFamilyDetail(headId) {
    if (!headId) { navigate('dashboard'); return; }
    const head = await db.getMember(headId);
    if (!head) { showToast('الأسرة غير موجودة', 'error'); navigate('dashboard'); return; }

    const members = await db.getFamilyMembers(headId);
    // Sort other members by age
    const otherMembers = members.filter(m => m.id !== head.id).sort((a, b) => sortByAge(a, b));

    const headPhotoHtml = head.photo 
        ? `<img src="${head.photo}" class="family-avatar-img" style="width:100px;height:100px;object-fit:cover;border-radius:50%;border:3px solid var(--primary);">`
        : `<div class="family-avatar" style="width:100px;height:100px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:36px;color:#ccc;border:3px solid var(--primary);"><i class="fas fa-user"></i></div>`;

    let membersRowsHtml = '';
    if (otherMembers.length === 0) {
        membersRowsHtml = `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted);">لا يوجد أفراد مضافين لهذه الأسرة بعد.</td></tr>`;
    } else {
        for (const m of otherMembers) {
            const ageDisplay = calculateAge(m.birthDate) !== '' ? calculateAge(m.birthDate) + ' سنة' : '-';
            const nameDisplay = m.relationship === 'زوجة' 
                ? `<span class="badge" style="margin-left:6px;font-size:10px;background:rgba(139,92,146,0.15);color:var(--accent)">زوجة</span>${m.fullName}` 
                : `<span class="badge" style="margin-left:6px;font-size:10px;background:rgba(16,185,129,0.15);color:var(--success)">فرد</span>${m.fullName}`;

            membersRowsHtml += `
                <tr>
                    <td data-label="الاسم">${nameDisplay}</td>
                    <td data-label="الهوية">${m.nationalId || '-'}</td>
                    <td data-label="صلة القرابة">${m.relationship || '-'}</td>
                    <td data-label="الجنس">${getGenderLabel(m.gender)}</td>
                    <td data-label="العمر">${ageDisplay}</td>
                    <td data-label="الحالة">${getMaritalLabel(m.maritalStatus)}</td>
                    <td data-label="الجوال">${m.phone || '-'}</td>
                    <td data-label="إجراءات" style="white-space:nowrap;">
                        <button class="btn btn-outline btn-sm" style="padding:4px 8px;font-size:11px;" onclick="navigate('edit-member',{memberId:${m.id}})"><i class="fas fa-edit"></i> تعديل</button>
                        <button class="btn btn-outline btn-sm" style="padding:4px 8px;font-size:11px;" onclick="renderMemberDocuments(${m.id}, ${headId}, '${m.role}')"><i class="fas fa-file-alt"></i> الوثائق</button>
                        <button class="btn btn-outline btn-sm" style="padding:4px 8px;font-size:11px;color:var(--primary);" onclick="promoteMemberToHead(${m.id})"><i class="fas fa-arrow-up"></i> ترقية لرب أسرة</button>
                        <button class="btn btn-danger btn-sm" style="padding:4px 8px;font-size:11px;" onclick="deleteFamilyMember(${m.id}, ${headId})"><i class="fas fa-trash"></i> حذف</button>
                    </td>
                </tr>`;
        }
    }

    const canDeleteHead = await db.canDeleteHead(headId);

    document.getElementById('mainContent').innerHTML = `
        <div class="section">
            <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
                <h3 class="section-title" style="margin:0;"><i class="fas fa-house-user"></i> تفاصيل أسرة: ${head.fullName}</h3>
                <div class="btn-group" style="display:flex; gap:8px;">
                    <button class="btn btn-primary btn-sm" onclick="navigate('add-member',{role:'child',familyId:${headId}})"><i class="fas fa-user-plus"></i> إضافة فرد للأسرة</button>
                    <button class="btn btn-success btn-sm" onclick="navigate('family-tree',{headId:${headId}})"><i class="fas fa-sitemap"></i> شجرة العائلة</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteFamilyCompletely(${headId})"><i class="fas fa-dumpster"></i> حذف الأسرة بالكامل</button>
                    <button class="btn btn-outline btn-sm" onclick="navigate('dashboard')"><i class="fas fa-arrow-right"></i> رجوع للرئيسية</button>
                </div>
            </div>

            <!-- Head of Family Profile Card -->
            <div class="card" style="display:flex; gap:20px; align-items:center; padding:20px; margin-bottom:24px; flex-wrap:wrap;">
                <div style="flex-shrink:0;">
                    ${headPhotoHtml}
                </div>
                <div style="flex:1; min-width:250px;">
                    <h4 style="margin:0 0 10px 0; font-size:18px; color:var(--primary);">${head.fullName} ${head.familyName ? '<span style="color:var(--text-muted)">(' + head.familyName + ')</span>' : ''} <span class="badge badge-primary">رب الأسرة</span></h4>
                    <div class="info-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; font-size:13px;">
                        <div><strong>رقم الهوية:</strong> ${head.nationalId || '-'}</div>
                        <div><strong>تاريخ الميلاد:</strong> ${formatDate(head.birthDate)} (${formatAge(head.birthDate)})</div>
                        <div><strong>الجنس:</strong> ${getGenderLabel(head.gender)}</div>
                        <div><strong>الحالة الاجتماعية:</strong> ${getMaritalLabel(head.maritalStatus)}</div>
                        <div><strong>اسم الأم:</strong> ${head.motherName || '-'}</div>
                        <div><strong>رقم الجوال:</strong> ${head.phone || '-'}</div>
                        <div><strong>رقم الجوال البديل:</strong> ${head.altPhone || '-'}</div>
                        <div><strong>العنوان:</strong> ${head.address || '-'}</div>
                    </div>
                    ${head.notes ? `<div style="margin-top:12px; font-size:12px; background:#f9f9f9; padding:8px; border-left:3px solid var(--primary); border-radius:4px;"><strong>ملاحظات:</strong> ${head.notes}</div>` : ''}
                </div>
                <div class="btn-group" style="display:flex; flex-direction:column; gap:8px; width:100%; max-width:150px; flex-shrink:0;">
                    <button class="btn btn-outline btn-full btn-sm" onclick="navigate('edit-member',{memberId:${head.id}})"><i class="fas fa-edit"></i> تعديل البيانات</button>
                    <button class="btn btn-outline btn-full btn-sm" onclick="renderMemberDocuments(${head.id}, ${headId}, 'head')"><i class="fas fa-file-alt"></i> الوثائق والملفات</button>
                    ${canDeleteHead ? `<button class="btn btn-danger btn-full btn-sm" onclick="deleteFamilyMember(${head.id}, null)"><i class="fas fa-trash"></i> حذف رب الأسرة</button>` : ''}
                </div>
            </div>

            <!-- Other Family Members -->
            <div class="section-header" style="margin-top:24px; margin-bottom:12px;">
                <h4 style="margin:0;"><i class="fas fa-users"></i> أفراد العائلة المضافين (${otherMembers.length})</h4>
            </div>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>الهوية</th>
                            <th>صلة القرابة</th>
                            <th>الجنس</th>
                            <th>العمر</th>
                            <th>الحالة</th>
                            <th>الجوال</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${membersRowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Global actions helper functions for the detail view
window.deleteFamilyMember = async function(memberId, headId) {
    const member = await db.getMember(memberId);
    if (!member) return;
    const name = member.fullName;
    
    showModal('تأكيد الحذف', `<p>هل أنت متأكد من حذف الفرد <strong>${name}</strong> من السجل؟</p>`,
        `<button class="btn btn-danger" onclick="confirmDeleteFamilyMember(${memberId}, ${headId})">نعم، احذف</button><button class="btn btn-outline" onclick="closeModal()">إلغاء</button>`);
};

window.confirmDeleteFamilyMember = async function(memberId, headId) {
    try {
        await db.deleteMember(memberId);
        closeModal();
        showToast('تم حذف الفرد بنجاح');
        if (headId) {
            renderFamilyDetail(headId);
        } else {
            navigate('dashboard');
        }
    } catch (err) {
        showToast('خطأ في الحذف: ' + err.message, 'error');
    }
};

window.promoteMemberToHead = async function(memberId) {
    const member = await db.getMember(memberId);
    if (!member) return;
    
    showModal('تأكيد الترقية', `<p>هل أنت متأكد من ترقية <strong>${member.fullName}</strong> ليكون رب أسرة مستقل في بطاقة عائلية جديدة؟</p>`,
        `<button class="btn btn-primary" onclick="confirmPromoteMemberToHead(${memberId})">نعم، ترقية</button><button class="btn btn-outline" onclick="closeModal()">إلغاء</button>`);
};

window.confirmPromoteMemberToHead = async function(memberId) {
    try {
        await db.promoteToHead(memberId);
        closeModal();
        showToast('تمت ترقية العضو ليكون رب أسرة جديد بنجاح');
        navigate('family-detail', { headId: memberId });
    } catch (err) {
        showToast('خطأ في الترقية: ' + err.message, 'error');
    }
};

window.deleteFamilyCompletely = async function(headId) {
    const head = await db.getMember(headId);
    if (!head) return;
    
    showModal('تأكيد حذف العائلة بالكامل', `<p style="color:var(--danger);">هل أنت متأكد من حذف أسرة <strong>${head.fullName}</strong> بالكامل؟ هذا الإجراء سيقوم بحذف رب الأسرة وجميع الأفراد والملفات والوثائق التابعة لهم ولا يمكن التراجع عنه!</p>`,
        `<button class="btn btn-danger" onclick="confirmDeleteFamilyCompletely(${headId})">نعم، احذف العائلة بالكامل</button><button class="btn btn-outline" onclick="closeModal()">إلغاء</button>`);
};

window.confirmDeleteFamilyCompletely = async function(headId) {
    try {
        await db.deleteFamilyCompletely(headId);
        closeModal();
        showToast('تم حذف الأسرة بالكامل بنجاح');
        navigate('dashboard');
    } catch (err) {
        showToast('خطأ في حذف الأسرة: ' + err.message, 'error');
    }
};

window.handleRowClick = function(event, id, role) {
    // If click was inside the checkbox cell, do not navigate
    if (event.target.type === 'checkbox' || event.target.closest('td:first-child')) {
        return;
    }
    if (role === 'head') {
        navigate('family-detail', { headId: id });
    } else {
        navigate('edit-member', { memberId: id });
    }
};
