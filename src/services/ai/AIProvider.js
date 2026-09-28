export class AIRequestError extends Error {
    kind;
    constructor(kind, message) {
        super(message);
        this.kind = kind;
        this.name = "AIRequestError";
    }
}
