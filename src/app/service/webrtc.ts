import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Webrtc {
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private peerConnection!: RTCPeerConnection;

  // STUN and TURN Servers
  private server: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }, // Free Google STUN
    ],
  };

  // Create Peerconnection
  public createPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection(this.server);

    // Handle remote stream
    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
    };
  }

  // Add local stream track to peer
  public addLocalTracks(): void {
    this.localStream?.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream!);
    });
  }

  // Create an Offer
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  // Create answer
  public async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.peerConnection.setRemoteDescription(offer);

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  // Handle answer from remote
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.peerConnection.setRemoteDescription(answer);
  }

  // Handle ICE candidates
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this.peerConnection.addIceCandidate(candidate);
  }

  // Emit ICE candidates
  public onIceCandidate(callback: (candidate: RTCIceCandidateInit) => void): void {
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) callback(event.candidate.toJSON());
    };
  }

  // Get remote stream
  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
}
