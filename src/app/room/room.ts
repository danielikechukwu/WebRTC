import { Component, OnInit, signal, ViewChild, ElementRef, effect, inject } from '@angular/core';
import { LocalStream } from './model/type';
import { CommonModule } from '@angular/common';
import { SignalingService } from '../service/signaling';
import { WebrtcService } from '../service/webrtc';
import { HotToastService } from '@ngxpert/hot-toast';

@Component({
  selector: 'app-room',
  imports: [CommonModule],
  templateUrl: './room.html',
  styleUrl: './room.css',
})
export default class Room implements OnInit {
  private signaling = inject(SignalingService);
  private webrtc = inject(WebrtcService);
  private _toast = inject(HotToastService);

  private mediaStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private localStream: MediaStream | null = null;

  protected permissionStatus = signal<string>('Not requested');
  protected isCameraEnabled = signal<boolean>(false);
  protected isAudioEnabled = signal<boolean>(false);
  protected isSharingScreen = signal<boolean>(false);

  protected username = localStorage.getItem('username') || '';

  combinedStream: MediaStream | null = null;

  // Keep track of the raw streams to stop tracks later
  private screenStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;

  // New variables
  peerConnection!: RTCPeerConnection;
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideoElement') remoteVideoElement!: ElementRef<HTMLVideoElement>;

  async ngOnInit() {
    this.checkPermissions();

    this.signaling.connect('ws://192.168.0.3:8080');
    this.signaling.onMessage((data) => this.handleSignalingData(data));
  }

  async checkPermissions(): Promise<any> {
    try {
      const cameraStatus = await navigator.permissions.query({ name: 'camera' });
      const microphoneStatus = await navigator.permissions.query({ name: 'microphone' });
      this.permissionStatus.set(
        `Camera: ${cameraStatus.state}, Microphone: ${microphoneStatus.state}`
      );
    } catch (error) {
      console.log('Error checking permission: ', error);
    }
  }

  // Requesting media access
  requestFullAccess(): void {
    if (this.mediaStream) this.stopMediaAccess();

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        this.mediaStream = stream;
        console.log('Local: ', this.mediaStream);
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        this.videoElement.nativeElement.play();
        this.isCameraEnabled.set(true);
        this.isAudioEnabled.set(true);

        // Add local tracks to the peer connection
        this.mediaStream.getTracks().forEach((track) => {
          this.webrtc.peerConnection.addTrack(track, this.mediaStream!);
        });
      })
      .catch((err) => {
        alert(`An error occurred: ${err}`);
      });
  }

  toggleVideo(): void {
    if (this.mediaStream) {
      const videoTracks = this.mediaStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !videoTracks[0].enabled;
        this.isCameraEnabled.set(videoTracks[0].enabled);
      }
    }
  }

  toggleAudio() {
    if (this.mediaStream) {
      const audioTracks = this.mediaStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        this.isAudioEnabled.set(audioTracks[0].enabled);
      }
    }
  }

  async shareScreen() {
    if (this.isSharingScreen()) this.stopScreenShare(); // Ensuring all possible screen share is stopped.

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraintSet,
        audio: true, // Capturing system audio whilst sharing
      });

      // Microphone stream while we share screen
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.combinedStream = this.mergeAudioStreams(this.screenStream, this.micStream);

      // Add the video track from the screen share to the combined stream
      this.combinedStream.addTrack(this.screenStream.getVideoTracks()[0]);

      // Assign the combined stream to the video element for local preview/transmission
      if (this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.combinedStream;
        await this.videoElement.nativeElement.play();
        this.isSharingScreen.set(true);
      }

      // Listen for the 'ended' event (user stops sharing via browser's native UI)
      this.screenStream.getVideoTracks()[0].onended = () => this.stopScreenShare();
    } catch (err) {
      console.log('Error: ', err);
      this.stopMediaTracks([this.screenStream, this.micStream]);
      this.isSharingScreen.set(false);
      alert('Could not start sharing both screen and microphone. Check permission');
    }
  }

  private mergeAudioStreams(screenStream: MediaStream, micStream: MediaStream): MediaStream {
    this.audioContext = new AudioContext();

    // Create sources from both streams
    const screenSource = this.audioContext.createMediaStreamSource(screenStream);
    const micSource = this.audioContext.createMediaStreamSource(micStream);

    // Create a single distination
    const destination = this.audioContext.createMediaStreamDestination();

    // Connect source to the destination
    screenSource.connect(destination);
    micSource.connect(destination);

    // The destination stream now has all audio tracks merged into one track
    return destination.stream;
  }

  stopScreenShare() {
    this.stopMediaTracks([this.screenStream, this.micStream, this.combinedStream]);
    if (this.videoElement.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isSharingScreen.set(false);
  }

  private stopMediaTracks(streams: (MediaStream | null)[]): void {
    streams.forEach((stream) => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    });
    this.screenStream = null;
    this.micStream = null;
    this.combinedStream = null;
  }

  chat() {
    console.log('Chat');
  }

  leaveMeeting() {
    console.log('Leave the meeting');
  }

  stopMediaAccess(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
      this.permissionStatus.set('Access stopped');
    }
  }

  // New setup

  async startCall() {
    this.peerConnection = new RTCPeerConnection();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this._toast.error(
        'Camera/mic not available. Make sure you are using a modern browser on HTTPS or localhost.'
      );
      return;
    }

    // local stream
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.localStream
      .getTracks()
      .forEach((track) => this.peerConnection.addTrack(track, this.localStream!));
    this.videoElement.nativeElement.srcObject = this.localStream;
    this.isCameraEnabled.set(true);
    this.isAudioEnabled.set(true);

    // remote stream
    const remoteStream = new MediaStream();
    this.remoteVideoElement.nativeElement.srcObject = remoteStream;
    this.peerConnection.ontrack = (event) =>
      event.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));

    // ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send({ type: 'candidate', candidate: event.candidate });
        console.log('ICE: ', event.candidate);
      }
    };

    // create offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.signaling.send({ type: 'offer', offer });
  }

  async handleSignalingData(data: any) {
    switch (data.type) {
      case 'offer':
        await this.handleOffer(data.offer);
        break;
      case 'answer':
        await this.handleAnswer(data.answer);
        break;
      case 'candidate':
        if (data.candidate) await this.peerConnection.addIceCandidate(data.candidate);
        break;
    }
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    this.peerConnection = new RTCPeerConnection();

    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    this.localStream
      .getTracks()
      .forEach((track) => this.peerConnection.addTrack(track, this.localStream!));
    this.videoElement.nativeElement.srcObject = this.localStream;

    this.remoteStream = new MediaStream();
    this.remoteVideoElement.nativeElement.srcObject = this.remoteStream;
    this.peerConnection.ontrack = (event) =>
      event.streams[0].getTracks().forEach((t) => this.remoteStream?.addTrack(t));

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send({ type: 'candidate', candidate: event.candidate });
      }
    };

    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.signaling.send({ type: 'answer', answer });
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    await this.peerConnection.setRemoteDescription(answer);
  }
}
