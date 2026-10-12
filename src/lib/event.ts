import mitt from "mitt";

export type Events = {
  logout: { expectedToken: string };
  payment_required: undefined;
};

const eventEmitter = mitt<Events>();

export { eventEmitter };
