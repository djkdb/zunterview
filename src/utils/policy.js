const MAX_DEPTH = { easy: 1, normal: 2, hard: 2 };
/** Number of follow-ups already asked on the thread `q` belongs to. */
export function threadDepth(interview, q) {
    const rootId = q.parentId ?? q.id;
    return interview.questions.filter((x) => x.parentId === rootId).length;
}
export function canAskFollowUp(interview, q) {
    const remaining = interview.config.questionLimit - interview.questions.length;
    if (remaining < 1)
        return false;
    // Company interviews should mostly use the company's own questions.
    const company = Boolean(interview.config.companyId);
    const maxDepth = company ? 1 : MAX_DEPTH[interview.config.difficulty];
    if (threadDepth(interview, q) >= maxDepth)
        return false;
    const followUps = interview.questions.filter((x) => x.isFollowUp).length;
    return followUps < Math.ceil(interview.config.questionLimit * (company ? 0.35 : 0.5));
}
export function isLastQuestion(interview) {
    return interview.questions.length >= interview.config.questionLimit;
}
