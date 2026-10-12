import mitt from "mitt";

export type Events = {
  logout: { expectedToken: string; complete?: (didLogout: boolean) => void };
  payment_required: undefined;
};

const eventEmitter = mitt<Events>();

export { eventEmitter };
