/** Error de negocio con un mensaje apto para mostrar al usuario. */
export class ActionError extends Error {}

/** La hora elegida ya no está disponible (llena, cerrada o pasada). */
export class SlotUnavailableError extends ActionError {}
