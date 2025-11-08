import { TestBed } from '@angular/core/testing';

import { Signaling } from './signaling';

describe('Signaling', () => {
  let service: Signaling;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Signaling);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
