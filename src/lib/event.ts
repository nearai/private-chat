import mitt from 'mitt';

export type Events = {
  logout: undefined;
  payment_required: undefined;
};

const eventEmitter = mitt<Events>();

export { eventEmitter };
