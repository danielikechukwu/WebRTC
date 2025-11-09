import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })

export class SignalingService {

  private ws!: WebSocket;
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

  send(data: any): void {
    this.ws.send(JSON.stringify(data));
  }

  onMessage(callback: (data: any) => void): void {
    this.onMessageCallback = callback;
  }
}
