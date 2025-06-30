import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  query,
  where,
  serverTimestamp,
  FieldValue,
  onSnapshot,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';

interface WorkshopBooking {
  id?: string;
  name: string;
  email: string;
  phone: string;
  participants: number | string;
  startDate: string;
  endDate: string;
  workshopPackage: string;
  specialRequests?: string;
  createdAt: FieldValue;
}

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isBooked: boolean;
  isSelected: boolean;
  isCheckIn: boolean;
  isCheckOut: boolean;
  isPast: boolean;
  isAvailable: boolean;
}

interface WorkshopPackage {
  id: string;
  name: string;
  price: number;
  duration: number; // in days
  description: string;
}

@Component({
  selector: 'app-workshops',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './workshop.component.html',
  styleUrl: './workshop.component.css',
})
export class WorkshopComponent implements OnInit, OnDestroy {
  // Calendar Properties
  currentMonthDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  currentMonthYear: string = '';

  // Booking Form
  bookingForm: FormGroup;
  workshopPackages: WorkshopPackage[] = [
    {
      id: 'weekend-intensive',
      name: 'Weekend Intensive',
      price: 3000,
      duration: 2,
      description:
        'Two full days of hands-on training in organic farming and composting',
    },
    {
      id: 'five-day-immersion',
      name: '5-Day Immersion',
      price: 7000,
      duration: 5,
      description:
        'Comprehensive training covering all aspects of organic farming',
    },
    {
      id: 'custom-package',
      name: 'Custom Package',
      price: 1500,
      duration: 1,
      description: 'Build your own workshop experience (minimum 1 day)',
    },
  ];

  isLoading = false;
  isSuccess = false;

  // Firestore
  private firestore: Firestore = inject(Firestore);
  private bookingsCollection = collection(this.firestore, 'workshop-bookings');
  private bookedDatesSet = new Set<string>();
  private firestoreUnsubscribe: (() => void) | undefined;

  private selectedStartDate: Date | null = null;
  private selectedEndDate: Date | null = null;

  constructor(private fb: FormBuilder, private router: Router) {
    this.bookingForm = this.fb.group(
      {
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required],
        participants: ['', Validators.required],
        startDate: ['', Validators.required],
        endDate: ['', Validators.required],
        workshopPackage: ['', Validators.required],
        specialRequests: [''],
      },
      { validator: this.endDateAfterStartDateValidator }
    );
  }

  ngOnInit(): void {
    this.currentMonthDate.setDate(1);
    this.updateCurrentMonthYear();
    this.fetchBookedDatesAndBuildCalendar();

    this.bookingForm.get('startDate')?.valueChanges.subscribe((val) => {
      this.selectedStartDate = val ? new Date(val + 'T00:00:00') : null;
      this.updateCalendarHighlights();
    });

    this.bookingForm.get('endDate')?.valueChanges.subscribe((val) => {
      this.selectedEndDate = val ? new Date(val + 'T00:00:00') : null;
      this.updateCalendarHighlights();
    });

    this.bookingForm.get('workshopPackage')?.valueChanges.subscribe((val) => {
      if (val && this.selectedStartDate) {
        const packageInfo = this.workshopPackages.find((p) => p.id === val);
        if (packageInfo && packageInfo.duration > 1) {
          const endDate = new Date(this.selectedStartDate);
          endDate.setDate(endDate.getDate() + packageInfo.duration - 1);
          this.bookingForm
            .get('endDate')
            ?.setValue(this.formatDateToYYYYMMDD(endDate));
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
    }
  }

  updateCurrentMonthYear(): void {
    this.currentMonthYear = `${
      this.monthNames[this.currentMonthDate.getMonth()]
    } ${this.currentMonthDate.getFullYear()}`;
  }

  fetchBookedDatesAndBuildCalendar(): void {
    const firstDayOfVisibleMonth = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth(),
      1
    );
    const lastDayOfVisibleMonth = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth() + 1,
      0
    );

    const q = query(
      this.bookingsCollection,
      where('endDate', '>=', this.formatDateToYYYYMMDD(firstDayOfVisibleMonth))
    );

    this.firestoreUnsubscribe = onSnapshot(q, (snapshot) => {
      this.bookedDatesSet.clear();
      snapshot.forEach((doc) => {
        const booking = doc.data() as WorkshopBooking;
        if (booking.startDate && booking.endDate) {
          const start = new Date(booking.startDate + 'T00:00:00');
          const end = new Date(booking.endDate + 'T00:00:00');
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            this.bookedDatesSet.add(this.formatDateToYYYYMMDD(new Date(d)));
          }
        }
      });
      this.buildCalendar();
    });
  }

  buildCalendar(): void {
    this.calendarDays = [];
    const year = this.currentMonthDate.getFullYear();
    const month = this.currentMonthDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonthDate = new Date(year, month, 1);
    const lastDayOfMonthDate = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonthDate.getDate();
    const firstDayOfWeek = firstDayOfMonthDate.getDay();

    // Add previous month's trailing days
    for (let i = 0; i < firstDayOfWeek; i++) {
      const dayDate = new Date(year, month, 0 - (firstDayOfWeek - 1 - i));
      this.calendarDays.push(
        this.createCalendarDayObject(dayDate, false, today)
      );
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      this.calendarDays.push(
        this.createCalendarDayObject(dayDate, true, today)
      );
    }

    // Add next month's leading days
    const totalDaysInGrid = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
    let nextMonthDayCounter = 1;
    for (let i = this.calendarDays.length; i < totalDaysInGrid; i++) {
      const dayDate = new Date(year, month + 1, nextMonthDayCounter++);
      this.calendarDays.push(
        this.createCalendarDayObject(dayDate, false, today)
      );
    }
    this.updateCalendarHighlights();
  }

  createCalendarDayObject(
    date: Date,
    isCurrentMonth: boolean,
    today: Date
  ): CalendarDay {
    const dateStr = this.formatDateToYYYYMMDD(date);
    const isPast = date < today;
    const isBooked = this.bookedDatesSet.has(dateStr);
    return {
      date: date,
      dayOfMonth: date.getDate(),
      isCurrentMonth: isCurrentMonth,
      isBooked: isBooked,
      isSelected: false,
      isCheckIn: false,
      isCheckOut: false,
      isPast: isPast,
      isAvailable: isCurrentMonth && !isBooked && !isPast,
    };
  }

  updateCalendarHighlights(): void {
    const startDateStr = this.selectedStartDate
      ? this.formatDateToYYYYMMDD(this.selectedStartDate)
      : null;
    const endDateStr = this.selectedEndDate
      ? this.formatDateToYYYYMMDD(this.selectedEndDate)
      : null;

    this.calendarDays.forEach((day) => {
      const dayStr = this.formatDateToYYYYMMDD(day.date);
      day.isCheckIn = dayStr === startDateStr;
      day.isCheckOut = dayStr === endDateStr;
      day.isSelected = false;

      if (startDateStr && endDateStr) {
        if (
          day.date >= this.selectedStartDate! &&
          day.date <= this.selectedEndDate!
        ) {
          day.isSelected = true;
        }
      } else if (startDateStr) {
        day.isSelected = dayStr === startDateStr;
      }
    });
  }

  selectDate(day: CalendarDay): void {
    if (!day.isCurrentMonth || day.isBooked || day.isPast) return;

    const selectedDateStr = this.formatDateToYYYYMMDD(day.date);
    const startDateControl = this.bookingForm.get('startDate');
    const endDateControl = this.bookingForm.get('endDate');

    if (
      !this.selectedStartDate ||
      (this.selectedStartDate && this.selectedEndDate)
    ) {
      // Start new selection
      this.selectedStartDate = day.date;
      this.selectedEndDate = null;
      startDateControl?.setValue(selectedDateStr);
      endDateControl?.setValue('');
    } else if (this.selectedStartDate && !this.selectedEndDate) {
      // Selecting end date
      if (day.date < this.selectedStartDate) {
        // If selected date is before start date, reset to this date
        this.selectedStartDate = day.date;
        this.selectedEndDate = null;
        startDateControl?.setValue(selectedDateStr);
        endDateControl?.setValue('');
      } else {
        // Check if range is valid (no booked dates in between)
        if (this.isRangeBooked(this.selectedStartDate, day.date)) {
          alert(
            'The selected date range includes booked dates. Please choose another range.'
          );
          this.selectedEndDate = null;
          endDateControl?.setValue('');
        } else {
          this.selectedEndDate = day.date;
          endDateControl?.setValue(selectedDateStr);
        }
      }
    }
    this.updateCalendarHighlights();
    this.bookingForm.updateValueAndValidity();
  }

  isRangeBooked(startDate: Date, endDate: Date): boolean {
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      if (this.bookedDatesSet.has(this.formatDateToYYYYMMDD(new Date(d)))) {
        return true;
      }
    }
    return false;
  }

  prevMonth(): void {
    this.currentMonthDate.setMonth(this.currentMonthDate.getMonth() - 1);
    this.updateCurrentMonthYear();
    this.fetchBookedDatesAndBuildCalendar();
  }

  nextMonth(): void {
    this.currentMonthDate.setMonth(this.currentMonthDate.getMonth() + 1);
    this.updateCurrentMonthYear();
    this.fetchBookedDatesAndBuildCalendar();
  }

  async onBookingSubmit(): Promise<void> {
    if (this.bookingForm.invalid) {
      Object.values(this.bookingForm.controls).forEach((control) => {
        control.markAsTouched();
      });
      alert('Please fill all required fields correctly.');
      return;
    }

    this.isLoading = true;

    const { startDate, endDate } = this.bookingForm.value;
    const startDateObj = new Date(startDate + 'T00:00:00');
    const endDateObj = new Date(endDate + 'T00:00:00');

    if (this.isRangeBooked(startDateObj, endDateObj)) {
      alert(
        'The selected date range has one or more booked dates. Please choose another range.'
      );
      this.fetchBookedDatesAndBuildCalendar();
      this.isLoading = false;
      return;
    }

    const bookingData: WorkshopBooking = {
      ...this.bookingForm.value,
      startDate: this.formatDateToYYYYMMDD(startDateObj),
      endDate: this.formatDateToYYYYMMDD(endDateObj),
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(this.bookingsCollection, bookingData);
      this.isSuccess = true;
      setTimeout(() => {
        this.isSuccess = false;
      }, 5000);

      this.bookingForm.reset();
      this.selectedStartDate = null;
      this.selectedEndDate = null;
      this.updateCalendarHighlights();
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert(
        'There was an error submitting your registration. Please try again.'
      );
    } finally {
      this.isLoading = false;
    }
  }

  endDateAfterStartDateValidator(
    group: FormGroup
  ): { [key: string]: any } | null {
    const startDate = group.controls['startDate']?.value;
    const endDate = group.controls['endDate']?.value;
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return { endDateBeforeStartDate: true };
    }
    return null;
  }

  formatDateToYYYYMMDD(date: Date): string {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }

  getToday(): string {
    return this.formatDateToYYYYMMDD(new Date());
  }

  get f() {
    return this.bookingForm.controls;
  }

  goBack() {
    this.router.navigate(['']);
  }
}
