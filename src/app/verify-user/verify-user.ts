import { Component, inject, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HotToastService } from '@ngxpert/hot-toast';

@Component({
  selector: 'app-verify-user',
  imports: [FormsModule],
  templateUrl: './verify-user.html',
  styleUrl: './verify-user.css',
})
export default class VerifyUser {
  private _router = inject(Router);
  private _toast = inject(HotToastService);

  protected localUser: WritableSignal<string> = signal<string>('');

  startCall() {
    if (!this.localUser()) {
      this._toast.error('Enter name to proceed');
      return;
    }

    localStorage.setItem('username', this.localUser());
    this._router.navigate(['/app']);
  }
}
