// js/db.js - IndexedDB Database Layer
class FamilyDB {
    constructor() {
        this.dbName = 'FamilyRegistryDB';
        this.dbVersion = 3;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('members')) {
                    const store = db.createObjectStore('members', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('nationalId', 'nationalId', { unique: false });
                    store.createIndex('familyId', 'familyId', { unique: false });
                    store.createIndex('role', 'role', { unique: false });
                    store.createIndex('fullName', 'fullName', { unique: false });
                }

                if (!db.objectStoreNames.contains('auditLog')) {
                    const logStore = db.createObjectStore('auditLog', { keyPath: 'id', autoIncrement: true });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => reject(event.target.error);
        });
    }

    _tx(storeName, mode = 'readonly') {
        const tx = this.db.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    _request(req) {
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    // ===== AUDIT LOG =====
    async addLogEntry(action, details) {
        const log = {
            action,
            details,
            timestamp: new Date().toISOString()
        };
        return this._request(this._tx('auditLog', 'readwrite').add(log));
    }

    async getAuditLogs() {
        return this._request(this._tx('auditLog').index('timestamp').getAll());
    }

    // ===== MEMBERS CRUD =====
    async addMember(member) {
        member.createdAt = new Date().toISOString();
        member.updatedAt = new Date().toISOString();
        const store = this._tx('members', 'readwrite');
        const id = await this._request(store.add(member));
        await this.addLogEntry('ADD_MEMBER', `تم إضافة فرد: ${member.fullName} (ID: ${id})`);
        return id;
    }

    async updateMember(id, data) {
        const tx = this.db.transaction('members', 'readwrite');
        const store = tx.objectStore('members');
        const member = await this._request(store.get(id));
        if (!member) throw new Error('العضو غير موجود');
        
        const oldName = member.fullName;
        Object.assign(member, data, { updatedAt: new Date().toISOString() });
        const updatedId = await this._request(store.put(member));
        await this.addLogEntry('UPDATE_MEMBER', `تم تحديث بيانات ${oldName} (ID: ${id})`);
        return updatedId;
    }

    async deleteMember(id) {
        const member = await this.getMember(id);
        const name = member ? member.fullName : `ID: ${id}`;
        const result = await this._request(this._tx('members', 'readwrite').delete(id));
        await this.addLogEntry('DELETE_MEMBER', `تم حذف فرد: ${name} (ID: ${id})`);
        return result;
    }

    async getMember(id) {
        return this._request(this._tx('members').get(id));
    }

    async getAllMembers() {
        return this._request(this._tx('members').getAll());
    }

    // ===== FAMILY QUERIES =====
    async getFamilyMembers(familyId) {
        return this._request(this._tx('members').index('familyId').getAll(familyId));
    }

    async getAllHeads() {
        return this._request(this._tx('members').index('role').getAll('head'));
    }

    // ===== STATS =====
    async getStats() {
        const all = await this.getAllMembers();
        const heads = all.filter(m => m.role === 'head');
        const males = all.filter(m => m.gender === 'male');
        const females = all.filter(m => m.gender === 'female');
        const alive = all.filter(m => !m.deathDate);
        const deceased = all.filter(m => m.deathDate);
        return {
            total: all.length,
            families: heads.length,
            males: males.length,
            females: females.length,
            alive: alive.length,
            deceased: deceased.length
        };
    }

    // ===== PROMOTE TO HEAD =====
    async promoteToHead(memberId) {
        const member = await this.getMember(memberId);
        if (!member) throw new Error('العضو غير موجود');
        member.role = 'head';
        member.familyId = memberId;
        member.updatedAt = new Date().toISOString();
        return this._request(this._tx('members', 'readwrite').put(member));
    }

    // ===== CHECK NATIONAL ID =====
    async isNationalIdExists(nationalId, excludeId = null) {
        const all = await this.getAllMembers();
        return all.some(m => m.nationalId === nationalId && m.id !== excludeId);
    }

    // ===== GET SIBLINGS =====
    async getSiblings(memberId) {
        const member = await this.getMember(memberId);
        if (!member) return [];
        const family = await this.getFamilyMembers(member.familyId);
        return family.filter(m => m.id !== memberId && m.role === member.role);
    }

    // ===== GET HEAD OF MEMBER =====
    async getHeadOfMember(memberId) {
        const member = await this.getMember(memberId);
        if (!member) return null;
        if (member.role === 'head') return member;
        const family = await this.getFamilyMembers(member.familyId);
        return family.find(m => m.role === 'head') || null;
    }

    // ===== IMPORT BULK =====
    async importMembers(members) {
        const results = { success: 0, failed: 0, errors: [] };
        for (const m of members) {
            try {
                if (!m.fullName || !m.fullName.trim()) {
                    results.failed++;
                    results.errors.push(`سطر بدون اسم - تم تخطيه`);
                    continue;
                }
                await this.addMember(m);
                results.success++;
            } catch (e) {
                results.failed++;
                results.errors.push(`${m.fullName}: ${e.message}`);
            }
        }
        return results;
    }

    // ===== DELETE FAMILY =====
    async canDeleteHead(headId) {
        const members = await this.getFamilyMembers(headId);
        const nonHead = members.filter(m => m.role !== 'head');
        return nonHead.length === 0;
    }

    async deleteFamilyCompletely(headId) {
        const members = await this.getFamilyMembers(headId);
        for (const m of members) {
            await this.deleteMember(m.id);
        }
    }

    // ===== MIGRATE WIFE TO CHILD =====
    async migrateWifesToChildren() {
        const all = await this.getAllMembers();
        const wives = all.filter(m => m.role === 'wife');
        for (const w of wives) {
            w.role = 'child';
            w.relationship = w.relationship || 'زوجة';
            w.updatedAt = new Date().toISOString();
            await this._request(this._tx('members', 'readwrite').put(w));
        }
        return wives.length;
    }

    // ===== FULL BACKUP/RESTORE =====
    async exportFullBackup() {
        const members = await this.getAllMembers();
        const auditLog = await this.getAuditLogs();
        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            members,
            auditLog
        };
    }

    async restoreFullBackup(backupData) {
        // Complete wipe and restore
        const members = await this.getAllMembers();
        for (const m of members) {
            await this.deleteMember(m.id);
        }
        // In a real app, we'd clear auditLog too.
        
        const results = await this.importMembers(backupData.members);
        return results;
    }
}
