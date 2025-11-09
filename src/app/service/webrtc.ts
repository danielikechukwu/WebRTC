import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WebrtcService {
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  public peerConnection!: RTCPeerConnection;

  // STUN and TURN Servers
  private server: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }, // Free Google STUN
    ],
  };

public createPeerConnection(onIceCandidate: (candidate: RTCIceCandidateInit) => void): void {
  const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  this.peerConnection = new RTCPeerConnection(configuration);
  this.remoteStream = new MediaStream();

  // Add ICE candidate handler
  this.peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('💠 Sending ICE candidate:', event.candidate);
      onIceCandidate(event.candidate.toJSON());
    }
  };

  // Receive remote track
  this.peerConnection.ontrack = (event) => {
    console.log('🎥 Received remote track');
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
