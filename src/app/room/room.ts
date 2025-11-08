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
  private screenStream: MediaStream | null = null;
  protected permissionStatus = signal<string>('Not requested');
  //protected cameraPermission = signal<string | undefined>(undefined);
  ///protected audioPermission = signal<string | undefined>(undefined);
  protected isCameraEnabled = signal<boolean>(false);
  protected isAudioEnabled = signal<boolean>(false);
  protected isSharingScreen = signal<boolean>(false);

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

  // VIDEO ACTIONS
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

  shareScreen() {}

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
