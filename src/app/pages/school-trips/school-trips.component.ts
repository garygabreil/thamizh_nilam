import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  Functions,
  FunctionsModule,
  httpsCallable,
} from '@angular/fire/functions';

import { getFunctions } from '@angular/fire/functions';
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
import { FeedbackCarouselComponent } from '../feedback-carousel/feedback-carousel.component';

interface SchoolTripBooking {
  id?: string;
  schoolName: string;
  contactPerson: string;
  email: string;
  phone: string;
  studentCount: string;
  tripDate: string;
  programType: string;
  specialRequirements?: string;
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

interface ProgramType {
  id: string;
  name: string;
  price: number;
  duration: string;
}

@Component({
  selector: 'app-school-trips',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FunctionsModule,
    FeedbackCarouselComponent,
  ],
  templateUrl: './school-trips.component.html',
  styleUrls: ['./school-trips.component.css'],
})
export class SchoolTripsComponent implements OnInit, OnDestroy {
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
  programTypes: ProgramType[] = [
    {
      id: 'elementary',
      name: 'Elementary Program',
      price: 300,
      duration: '2-3 hours',
    },
    {
      id: 'middle',
      name: 'Middle School Program',
      price: 450,
      duration: '4 hours',
    },
    {
      id: 'high',
      name: 'High School Program',
      price: 600,
      duration: 'Full day',
    },
  ];

  isLoading = false;
  isSuccess = false;
  showTotal = false;
  totalAmount = 0;

  private firestore: Firestore = inject(Firestore);
  private bookingsCollection = collection(
    this.firestore,
    'school-trip-bookings'
  );
  private bookedDatesSet = new Set<string>();
  private firestoreUnsubscribe: (() => void) | undefined;

  private selectedDate: Date | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private functions: Functions
  ) {
    this.bookingForm = this.fb.group({
      schoolName: ['', Validators.required],
      contactPerson: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      studentCount: ['', Validators.required],
      tripDate: ['', Validators.required],
      programType: ['', Validators.required],
      specialRequirements: [''],
    });

    this.bookingForm.get('programType')?.valueChanges.subscribe(() => {
      this.calculateTotal();
    });

    this.bookingForm.get('studentCount')?.valueChanges.subscribe(() => {
      this.calculateTotal();
    });

    this.bookingForm.valueChanges.subscribe(() => {
      this.calculateTotal();
    });
  }

  ngOnInit(): void {
    this.currentMonthDate.setDate(1);
    this.updateCurrentMonthYear();
    this.fetchBookedDatesAndBuildCalendar();

    this.bookingForm.get('tripDate')?.valueChanges.subscribe((val) => {
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

    const q = query(
      this.bookingsCollection,
      where('tripDate', '>=', this.formatDateToYYYYMMDD(firstDayOfVisibleMonth))
    );

    this.firestoreUnsubscribe = onSnapshot(q, (snapshot) => {
      this.bookedDatesSet.clear();
      snapshot.forEach((doc) => {
        const booking = doc.data() as SchoolTripBooking;
        if (booking.tripDate) {
          this.bookedDatesSet.add(booking.tripDate);
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
      isCheckIn: false,
      isCheckOut: false,
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
      day.isCheckIn = dayStr === selectedDateStr;
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
    this.bookingForm.get('tripDate')?.setValue(selectedDateStr);
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
    const programTypeId = this.bookingForm.get('programType')?.value;
    const studentCount = this.bookingForm.get('studentCount')?.value;

    // Reset if either field is empty
    if (!programTypeId || !studentCount) {
      this.showTotal = false;
      this.totalAmount = 0;
      return;
    }

    // Parse studentCount as number (handle empty string case)
    const studentCountNum = parseInt(studentCount, 10) || 0;

    const program = this.programTypes.find((p) => p.id === programTypeId);
    if (program && studentCountNum > 0) {
      this.totalAmount = program.price * studentCountNum;
      this.showTotal = true;
    } else {
      this.showTotal = false;
      this.totalAmount = 0;
    }
  }

  getSelectedProgramType(): ProgramType | undefined {
    const programTypeId = this.bookingForm.get('programType')?.value;
    return this.programTypes.find((p) => p.id === programTypeId);
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
      const { tripDate } = this.bookingForm.value;
      const tripDateObj = new Date(tripDate + 'T00:00:00');

      if (this.bookedDatesSet.has(this.formatDateToYYYYMMDD(tripDateObj))) {
        alert('This date is already booked. Please choose another date.');
        this.fetchBookedDatesAndBuildCalendar();
        this.isLoading = false;
        return;
      }

      const bookingData: SchoolTripBooking = {
        ...this.bookingForm.value,
        tripDate: this.formatDateToYYYYMMDD(tripDateObj),
        createdAt: serverTimestamp(),
      };

      await addDoc(this.bookingsCollection, bookingData);

      try {
        await httpsCallable(this.functions, 'onSchoolTripBooking')();
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

  selectPackage(programType: string): void {
    // Set the program type in the form and scroll to the reservation form
    if (this.bookingForm && this.bookingForm.get('programType')) {
      this.bookingForm.get('programType')!.setValue(programType);
    }
    // Optionally scroll to the reservation form if needed
    const element = document.getElementById('reservationForm');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
