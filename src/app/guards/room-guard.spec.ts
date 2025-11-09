import { TestBed } from '@angular/core/testing';
import { CanDeactivateFn } from '@angular/router';

import { roomGuard } from './room-guard';

describe('roomGuard', () => {
  const executeGuard: CanDeactivateFn<unknown> = (...guardParameters) => 
      TestBed.runInInjectionContext(() => roomGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
