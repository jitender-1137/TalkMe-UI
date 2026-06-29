export type ConsentStatus = "NONE" | "PENDING" | "GRANTED" | "DECLINED"

/** Per-chat explicit-content consent state returned by the API. */
export interface ConsentState {
  chatId: string
  status: ConsentStatus
  canRequest: boolean
  canRevoke: boolean
  isRequester: boolean
  awaitingMyAccept: boolean
  heldMessageCount: number
  /** Consecutive declines; at 3 no further request is allowed (either side). */
  declineCount: number
}
