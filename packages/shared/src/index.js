"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_TRANSITIONS = exports.ProjectStatus = void 0;
exports.canTransition = canTransition;
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["DRAFT"] = "DRAFT";
    ProjectStatus["PREVIEW_SHARED"] = "PREVIEW_SHARED";
    ProjectStatus["AWAITING_PAYMENT"] = "AWAITING_PAYMENT";
    ProjectStatus["PAID"] = "PAID";
    ProjectStatus["DELIVERED"] = "DELIVERED";
    ProjectStatus["EXPIRED"] = "EXPIRED";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
exports.ALLOWED_TRANSITIONS = {
    [ProjectStatus.DRAFT]: [ProjectStatus.PREVIEW_SHARED, ProjectStatus.EXPIRED],
    [ProjectStatus.PREVIEW_SHARED]: [ProjectStatus.AWAITING_PAYMENT, ProjectStatus.EXPIRED],
    [ProjectStatus.AWAITING_PAYMENT]: [ProjectStatus.PAID, ProjectStatus.EXPIRED],
    [ProjectStatus.PAID]: [ProjectStatus.DELIVERED],
    [ProjectStatus.DELIVERED]: [],
    [ProjectStatus.EXPIRED]: [],
};
function canTransition(from, to) {
    return exports.ALLOWED_TRANSITIONS[from].includes(to);
}
//# sourceMappingURL=index.js.map