import { SetMetadata } from "@nestjs/common";

export const SUCCESS_MESSAGE_KEY = "success_message";

/** Method-level overrides class-level — ResponseInterceptor reads this via getAllAndOverride. */
export const SuccessMessage = (message: string) => SetMetadata(SUCCESS_MESSAGE_KEY, message);
