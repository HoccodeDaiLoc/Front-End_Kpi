import api from './axios';  // ✅ Thêm dòng này vào đầu file

export const getProposals       = ()         => api.get('/proposals');
export const getProposalById    = (id)       => api.get(`/proposals/${id}`);
export const createProposal     = (data)     => api.post('/proposals', data);
export const deleteProposal     = (id)       => api.delete(`/proposals/${id}`);
export const closeProposal      = (id)       => api.patch(`/proposals/${id}/close`);
export const getProposalResults = (id)       => api.get(`/proposals/${id}/results`);

export const getMyProposals       = ()       => api.get('/my-proposals');
export const getProposalQuestions = (id)     => api.get(`/my-proposals/${id}/questions`);
export const submitProposal       = (id, data) => api.post(`/my-proposals/${id}/submit`, data);

export const updateProposal         = (id, data)   => api.put(`/proposals/${id}`, data);
export const sendProposalToDept     = (id, deptId) => api.post(`/proposals/${id}/send`, { departmentId: deptId });
export const revokeProposalFromDept = (id, deptId) => api.delete(`/proposals/${id}/revoke/${deptId}`);