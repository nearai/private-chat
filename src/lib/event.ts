import mitt from 'mitt';

export type Events = {
  logout: undefined;
  payment_required: undefined;
  model_not_allowed: { model: string; plan?: string };
};

const eventEmitter = mitt<Events>();

export { eventEmitter };
