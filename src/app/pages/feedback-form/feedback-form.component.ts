import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Firestore, addDoc, collection } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';

interface Feedback {
  name: string;
  email: string;
  visitType: 'farm-stay' | 'farm-visit' | 'photoshoot' | 'school-trip';
  rating: number;
  feedback: string;
  createdAt: Date;
}

@Component({
  selector: 'app-feedback-form',
  templateUrl: './feedback-form.component.html',
  styleUrls: ['./feedback-form.component.css'],
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
})
export class FeedbackFormComponent {
  feedbackForm: FormGroup;
  isLoading = false;
  isSubmitted = false;
  visitTypes = [
    { value: 'farm-stay', label: 'Farm Stay' },
    { value: 'farm-visit', label: 'Farm Visit' },
    { value: 'photoshoot', label: 'Photoshoot' },
    { value: 'school-trip', label: 'School Trip' },
  ];

  constructor(private fb: FormBuilder, private firestore: Firestore) {
    this.feedbackForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      visitType: ['', Validators.required],
      rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      feedback: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  async onSubmit() {
    if (this.feedbackForm.invalid) {
      this.markFormGroupTouched(this.feedbackForm);
      return;
    }

    this.isLoading = true;

    try {
      const feedbackData: Feedback = {
        ...this.feedbackForm.value,
        createdAt: new Date(),
      };

      // Save to appropriate collection based on visit type
      const collectionName = `${feedbackData.visitType}-feedbacks`;
      await addDoc(collection(this.firestore, collectionName), feedbackData);

      this.isSubmitted = true;
      this.feedbackForm.reset();
      this.feedbackForm.get('rating')?.setValue(0);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('There was an error submitting your feedback. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  get f() {
    return this.feedbackForm.controls;
  }
}
