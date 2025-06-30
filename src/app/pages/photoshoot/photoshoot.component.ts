import { Component, inject, OnDestroy, OnInit } from '@angular/core';
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
  addDoc,
  query,
  where,
  serverTimestamp,
  FieldValue,
  onSnapshot,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import {
  Functions,
  FunctionsModule,
  httpsCallable,
} from '@angular/fire/functions';
import { FeedbackCarouselComponent } from '../feedback-carousel/feedback-carousel.component';

interface Booking {
  id?: string;
  name: string;
  email: string;
  phone: string;
  guests: number | string;
  date: string;
  time: string;
  packageType: string;
  specialRequests?: string;
  totalAmount: number;
  createdAt: FieldValue;
}

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isBooked: boolean;
  isSelected: boolean;
  isPast: boolean;
  isAvailable: boolean;
  isCheckIn?: boolean;
  isCheckOut?: boolean;
}

interface PackageType {
  id: string;
  name: string;
  price: number;
  duration: string;
}

@Component({
  selector: 'app-photoshoot',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FunctionsModule,
    FeedbackCarouselComponent,
  ],
  templateUrl: './photoshoot.component.html',
  styleUrls: ['./photoshoot.component.css'],
})
export class PhotoshootComponent implements OnInit, OnDestroy {
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

  bookingForm: FormGroup;
  packageTypes: PackageType[] = [
    { id: 'basic', name: 'Basic Package', price: 2500, duration: '1 hour' },
    {
      id: 'premium',
      name: 'Premium Package',
      price: 4500,
      duration: '2 hours',
    },
    { id: 'deluxe', name: 'Deluxe Package', price: 8500, duration: '4 hours' },
  ];

  availableTimes = [
    '08:00 AM',
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
  ];

  isLoading = false;
  isSuccess = false;
  showTotal = false;
  totalAmount = 0;

  private firestore: Firestore = inject(Firestore);
  private bookingsCollection = collection(
    this.firestore,
    'photoshoot-bookings'
  );
  private bookedDatesSet = new Set<string>();
  private firestoreUnsubscribe: (() => void) | undefined;
  private functions: Functions = inject(Functions);

  private selectedDate: Date | null = null;

  constructor(private fb: FormBuilder, private router: Router) {
    this.bookingForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      packageType: ['', Validators.required], // <-- must match template!
      date: ['', Validators.required],
      time: ['', Validators.required],
      participants: [1, [Validators.required, Validators.min(1)]],
      specialRequests: [''],
    });

    this.bookingForm.valueChanges.subscribe(() => {
      this.calculateTotal();
    });
  }

  ngOnInit(): void {
    this.currentMonthDate.setDate(1);
    this.updateCurrentMonthYear();
    this.fetchBookedDatesAndBuildCalendar();

    this.bookingForm.get('date')?.valueChanges.subscribe((val) => {
      this.selectedDate = val ? new Date(val + 'T00:00:00') : null;
      this.updateCalendarHighlights();
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
      where('date', '>=', this.formatDateToYYYYMMDD(firstDayOfVisibleMonth)),
      where('date', '<=', this.formatDateToYYYYMMDD(lastDayOfVisibleMonth))
    );

    this.firestoreUnsubscribe = onSnapshot(q, (snapshot) => {
      this.bookedDatesSet.clear();
      snapshot.forEach((doc) => {
        const booking = doc.data() as Booking;
        if (booking.date) {
          this.bookedDatesSet.add(booking.date);
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

    for (let i = 0; i < firstDayOfWeek; i++) {
      const dayDate = new Date(year, month, 0 - (firstDayOfWeek - 1 - i));
      this.calendarDays.push(
        this.createCalendarDayObject(dayDate, false, today)
      );
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      this.calendarDays.push(
        this.createCalendarDayObject(dayDate, true, today)
      );
    }

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
      isPast: isPast,
      isAvailable: isCurrentMonth && !isBooked && !isPast,
    };
  }

  updateCalendarHighlights(): void {
    const selectedDateStr = this.selectedDate
      ? this.formatDateToYYYYMMDD(this.selectedDate)
      : null;

    this.calendarDays.forEach((day) => {
      const dayStr = this.formatDateToYYYYMMDD(day.date);
      day.isSelected = dayStr === selectedDateStr;
    });
  }

  formatDateToYYYYMMDD(date: Date): string {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }

  selectDate(day: CalendarDay): void {
    if (!day.isCurrentMonth || day.isBooked || day.isPast) return;

    const selectedDateStr = this.formatDateToYYYYMMDD(day.date);
    this.selectedDate = day.date;
    this.bookingForm.get('date')?.setValue(selectedDateStr);
    this.updateCalendarHighlights();
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

  calculateTotal(): void {
    const packageTypeId = this.bookingForm.get('packageType')?.value;

    if (packageTypeId) {
      const packageType = this.packageTypes.find((p) => p.id === packageTypeId);
      if (packageType) {
        this.totalAmount = packageType.price;
        this.showTotal = true;
        return;
      }
    }
    this.showTotal = false;
    this.totalAmount = 0;
  }

  getSelectedPackage(): PackageType | undefined {
    const packageTypeId = this.bookingForm.get('packageType')?.value;
    return this.packageTypes.find((p) => p.id === packageTypeId);
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

    try {
      const { date } = this.bookingForm.value;
      const bookingDate = new Date(date + 'T00:00:00');

      if (this.bookedDatesSet.has(this.formatDateToYYYYMMDD(bookingDate))) {
        alert(
          'The selected date is already booked. Please choose another date.'
        );
        this.fetchBookedDatesAndBuildCalendar();
        this.isLoading = false;
        return;
      }

      const bookingData: Booking = {
        ...this.bookingForm.value,
        date: this.formatDateToYYYYMMDD(bookingDate),
        totalAmount: this.totalAmount,
        createdAt: serverTimestamp(),
      };

      await addDoc(this.bookingsCollection, bookingData);

      try {
        await httpsCallable(this.functions, 'onPhotoshootBooking')();
      } catch (err) {
        console.log(err);
      }
      this.isSuccess = true;
      setTimeout(() => this.bookingForm.reset(), 3000);
    } catch (error) {
      console.error('Booking process failed:', error);
      alert('Booking failed. Please try again or contact support.');
    } finally {
      this.isLoading = false;
    }
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
