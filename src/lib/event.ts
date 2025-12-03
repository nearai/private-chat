import mitt from 'mitt';

export type Events = {
  logout: any;
};

const eventEmitter = mitt<Events>();

export { eventEmitter };
