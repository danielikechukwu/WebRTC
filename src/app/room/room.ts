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
  private pendingCandidates: RTCIceCandidateInit[] = [];

  protected localUsername = signal<string>('');
protected remoteUsername = signal<string>('');

  // New variables
  peerConnection!: RTCPeerConnection;
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideoElement') remoteVideoElement!: ElementRef<HTMLVideoElement>;

  async ngOnInit() {
    this.checkPermissions(); // Check for media permission

    // this.signaling.connect('ws://192.168.0.3:8080');
    this.signaling.connect('https://webrtc-signaling-server-o8h1.onrender.com');

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

  /*** Start a call (creates offer) */
  async startCall() {
    console.log('Starting call...');

    this.createPeerConnection(); // Create peer connection.

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

    // create offer and send
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.signaling.send({ type: 'offer', offer, username: this.username });

    console.log('Sent offer to signaling server');
  }

  /** Create peer connection and handle tracks + ICE candidates */
  private createPeerConnection() {
    this.peerConnection = new RTCPeerConnection();

    // Setup remote stream
    this.remoteStream = new MediaStream();
    this.remoteVideoElement.nativeElement.srcObject = this.remoteStream;

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
      console.log('Remote track received');
    };

    // Send ICE candidates to signaling server
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        this.signaling.send({ type: 'candidate', candidate: event.candidate });
      } else {
        console.log('ICE gathering complete');
      }
    };
  }

  /** Handle incoming messages from signaling server */
  async handleSignalingData(data: any) {
    console.log('Received signaling data:', data);

    switch (data.type) {
      case 'offer':
        await this.handleOffer(data.offer);
        break;

      case 'answer':
        await this.handleAnswer(data.answer);
        break;

      case 'candidate':
        await this.handleCandidate(data.candidate);
        break;

      default:
        console.warn('Unknown signaling message type:', data.type);
    }
  }

  /** Handle received offer */
  // async handleOffer(offer: RTCSessionDescriptionInit) {
    async handleOffer(offer: any) {
    console.log('Handling received offer');

    this.remoteUsername.set(offer.username || 'Guest'); // Capture remote username

    this.createPeerConnection();

    // Get local media
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.localStream
      .getTracks()
      .forEach((track) => this.peerConnection.addTrack(track, this.localStream!));
    this.videoElement.nativeElement.srcObject = this.localStream;

    // Set remote description
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Create answer
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.signaling.send({ type: 'answer', answer, username: this.username });
    console.log('Sent answer');

    // Apply any queued ICE candidates that arrived early
    this.flushPendingCandidates();
  }

  /** Handle received answer */
  // async handleAnswer(answer: RTCSessionDescriptionInit) {
    async handleAnswer(answer: any) {
    console.log('Handling received answer');
    this.remoteUsername.set(answer.username || 'Guest'); // Capture remote username
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

    // Apply queued ICE candidates (if any)
    this.flushPendingCandidates();
  }

  /** Handle ICE candidates safely */
  async handleCandidate(candidate: RTCIceCandidateInit) {
    if (!candidate) return;

    if (this.peerConnection.remoteDescription) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('Added ICE candidate');
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    } else {
      console.warn('Remote description not set yet, queueing ICE candidate');
      this.pendingCandidates.push(candidate);
    }
  }

  /** Apply queued ICE candidates once remoteDescription is ready */
  private async flushPendingCandidates() {
    if (!this.peerConnection.remoteDescription) return;

    for (const candidate of this.pendingCandidates) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('Added queued ICE candidate');
      } catch (err) {
        console.error('Error adding queued ICE candidate:', err);
      }
    }

    this.pendingCandidates = [];
  }
}
