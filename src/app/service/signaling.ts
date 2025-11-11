import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SignalingService {
  private ws: WebSocket | undefined;
  private onMessageCallback!: (data: any) => void;

  connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => console.log('Connected to signaling server');

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Message from server:', data);
      if (this.onMessageCallback) this.onMessageCallback(data);
    };
    this.ws.onerror = (err) => console.error('WebSocket error:', err);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  send(data: any): void {
    if (this.ws) this.ws.send(JSON.stringify(data));
  }

  onMessage(callback: (data: any) => void): void {
    this.onMessageCallback = callback;
  }
}
