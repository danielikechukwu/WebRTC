import { CommonModule } from '@angular/common';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-verify-user',
  imports: [RouterLink, FormsModule],
  templateUrl: './verify-user.html',
  styleUrl: './verify-user.css',
})
export default class VerifyUser {
  protected localUser: WritableSignal<string> = signal<string>('');
}
