export interface MessagePart {
  type: string;
  text?: string;
  ignored?: boolean;
}

export interface ChatMessageInput {
  sessionID: string;
}

export interface ChatMessageOutput {
  message: {
    role: string;
  };
  parts: MessagePart[];
}
