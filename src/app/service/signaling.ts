import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Signaling {
  private socket!: WebSocket;

  private message$ = new Subject<any>();

  connect(serverUrl: string): void {
    this.socket = new WebSocket(serverUrl);

    this.socket.onmessage = (event) => {
      this.message$.next(JSON.parse(event.data));
    };
  }

  sendMessage(data: any): void {
    this.socket.send(JSON.stringify(data));
  }

  onMessage(): Observable<any> {
    return this.message$.asObservable();
  }
}
