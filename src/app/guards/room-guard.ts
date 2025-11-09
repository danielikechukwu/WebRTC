import { CanDeactivateFn } from '@angular/router';
import Room from '../room/room';

export const roomGuard: CanDeactivateFn<unknown> = (component, currentRoute, currentState, nextState) => {

  const room = new Room();

  
  return true;
};
