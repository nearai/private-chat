import mitt from 'mitt';

export type Events = {
  logout: undefined;
};

const eventEmitter = mitt<Events>();

export { eventEmitter };
