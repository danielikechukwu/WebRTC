import { Component, OnInit, signal, ViewChild, ElementRef, effect } from '@angular/core';
import { LocalStream } from './model/type';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-room',
  imports: [CommonModule],
  templateUrl: './room.html',
  styleUrl: './room.css',
})
export default class Room implements OnInit {
  protected localStream = signal<LocalStream>({ name: 'Peter' });
  protected remoteStream = signal<LocalStream[]>([{ name: 'Jasme' }]);
  private mediaStream: MediaStream | null = null;

  protected permissionStatus = signal<string>('Not requested');
  protected isCameraEnabled = signal<boolean>(false);
  protected isAudioEnabled = signal<boolean>(false);
  protected isSharingScreen = signal<boolean>(false);

  combinedStream: MediaStream | null = null;

  // Keep track of the raw streams to stop tracks later
  private screenStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  ngOnInit(): void {
    this.checkPermissions(); // Accessing permission

    //this.requestMediaAccess(); // Permission to access media devices
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
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        this.videoElement.nativeElement.play();
        this.isCameraEnabled.set(true);
        this.isAudioEnabled.set(true);
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

  chat() {}

  leaveMeeting() {}

  stopMediaAccess(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
      this.permissionStatus.set('Access stopped');
    }
  }
}
