import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { logger } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// Define secrets for email credentials
const emailUser = defineSecret('EMAIL_USER');
const emailPass = defineSecret('EMAIL_PASS');

admin.initializeApp();

// Email configuration using secrets
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'basegoga4@gmail.com',
    pass: 'udiawhbnzpendypk',
  },
});

// Constants
const FEEDBACK_LINK = 'https://thamizh-nilam.web.app/feedback';
const ADMIN_EMAIL = 'admin@thamizhnilam.com';
const SUPPORT_EMAIL = 'support@thamizhnilam.com';

// Type definitions
interface BaseBooking {
  name: string;
  email: string;
  phone: string;
  createdAt?: admin.firestore.Timestamp;
  feedbackSent?: boolean;
}

interface FarmStayBooking extends BaseBooking {
  checkin: string;
  checkout: string;
  roomType: string;
  guests: number;
  specialRequests?: string;
}

interface FarmVisitBooking extends BaseBooking {
  checkin: string;
  packageName: string;
  packagePrice: number;
  totalAmount: number;
  specialRequests?: string;
}

interface SchoolTripBooking extends BaseBooking {
  schoolName: string;
  contactPerson: string;
  studentCount: number;
  tripDate: string;
  programType: string;
  specialRequirements?: string;
}

interface PhotoshootBooking extends BaseBooking {
  date: string;
  time: string;
  packageType: string;
  participants: number;
  specialRequests?: string;
}

// ======================
// CORE PROCESSING FUNCTION
// ======================

async function processBooking(
  bookingType: 'farm-stay' | 'farm-visit' | 'school-trip' | 'photoshoot',
  booking: BaseBooking,
  bookingId: string
) {
  try {
    // 1. Send confirmation to customer
    await sendCustomerConfirmation(bookingType, booking);

    // 2. Send notification to admin
    await sendAdminNotification(bookingType, booking, bookingId);

    logger.log(`Successfully processed ${bookingType} booking ${bookingId}`);
  } catch (error) {
    logger.error(
      `Error processing ${bookingType} booking ${bookingId}:`,
      error
    );
    throw error;
  }
}

// ======================
// EMAIL TEMPLATES
// ======================

async function sendCustomerConfirmation(
  bookingType: string,
  booking: BaseBooking
) {
  const templates = {
    'farm-stay': {
      subject: 'Farm Stay Booking Confirmation',
      text: `Dear ${booking.name},\n\nYour farm stay booking from ${
        (booking as FarmStayBooking).checkin
      } to ${
        (booking as FarmStayBooking).checkout
      } is confirmed.\n\nRoom Type: ${
        (booking as FarmStayBooking).roomType
      }\nGuests: ${(booking as FarmStayBooking).guests}\n\nThank you!`,
      html: `<p>Dear ${booking.name},</p>
            <p>Your farm stay booking from ${
              (booking as FarmStayBooking).checkin
            } to ${(booking as FarmStayBooking).checkout} is confirmed.</p>
            <p><strong>Room Type:</strong> ${
              (booking as FarmStayBooking).roomType
            }<br>
            <strong>Guests:</strong> ${(booking as FarmStayBooking).guests}</p>
            <p>Thank you!</p>`,
    },
    'farm-visit': {
      subject: 'Farm Visit Booking Confirmation',
      text: `Dear ${booking.name},\n\nYour farm visit on ${
        (booking as FarmVisitBooking).checkin
      } is confirmed.\n\nPackage: ${
        (booking as FarmVisitBooking).packageName
      }\nTotal Amount: ₹${
        (booking as FarmVisitBooking).totalAmount
      }\n\nThank you!`,
      html: `<p>Dear ${booking.name},</p>
            <p>Your farm visit on ${
              (booking as FarmVisitBooking).checkin
            } is confirmed.</p>
            <p><strong>Package:</strong> ${
              (booking as FarmVisitBooking).packageName
            }<br>
            <strong>Total Amount:</strong> ₹${
              (booking as FarmVisitBooking).totalAmount
            }</p>
            <p>Thank you!</p>`,
    },
    'school-trip': {
      subject: 'School Trip Booking Confirmation',
      text: `Dear ${
        (booking as SchoolTripBooking).contactPerson
      },\n\nYour school trip booking for ${
        (booking as SchoolTripBooking).schoolName
      } on ${
        (booking as SchoolTripBooking).tripDate
      } is confirmed.\n\nStudents: ${
        (booking as SchoolTripBooking).studentCount
      }\nProgram: ${(booking as SchoolTripBooking).programType}\n\nThank you!`,
      html: `<p>Dear ${(booking as SchoolTripBooking).contactPerson},</p>
            <p>Your school trip booking for ${
              (booking as SchoolTripBooking).schoolName
            } on ${(booking as SchoolTripBooking).tripDate} is confirmed.</p>
            <p><strong>Students:</strong> ${
              (booking as SchoolTripBooking).studentCount
            }<br>
            <strong>Program:</strong> ${
              (booking as SchoolTripBooking).programType
            }</p>
            <p>Thank you!</p>`,
    },
    photoshoot: {
      subject: 'Photoshoot Booking Confirmation',
      text: `Dear ${booking.name},\n\nYour photoshoot booking on ${
        (booking as PhotoshootBooking).date
      } at ${(booking as PhotoshootBooking).time} is confirmed.\n\nPackage: ${
        (booking as PhotoshootBooking).packageType
      }\nParticipants: ${
        (booking as PhotoshootBooking).participants
      }\n\nThank you!`,
      html: `<p>Dear ${booking.name},</p>
            <p>Your photoshoot booking on ${
              (booking as PhotoshootBooking).date
            } at ${(booking as PhotoshootBooking).time} is confirmed.</p>
            <p><strong>Package:</strong> ${
              (booking as PhotoshootBooking).packageType
            }<br>
            <strong>Participants:</strong> ${
              (booking as PhotoshootBooking).participants
            }</p>
            <p>Thank you!</p>`,
    },
  };

  const template = templates[bookingType as keyof typeof templates] || {
    subject: 'Booking Confirmation',
    text: `Dear ${booking.name},\n\nYour booking is confirmed.\n\nThank you!`,
    html: `<p>Dear ${booking.name},</p>
          <p>Your booking is confirmed.</p>
          <p>Thank you!</p>`,
  };

  const mailOptions = {
    from: '"Thamizh Nilam" <contact@thamizhnilam.com>',
    to: booking.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  };

  return transporter.sendMail(mailOptions);
}

async function sendAdminNotification(
  bookingType: string,
  booking: BaseBooking,
  bookingId: string
) {
  const details = {
    'farm-stay': `
      <h3>New Farm Stay Booking</h3>
      <p><strong>Booking ID:</strong> ${bookingId}</p>
      <p><strong>Name:</strong> ${booking.name}</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      <p><strong>Phone:</strong> ${booking.phone}</p>
      <p><strong>Dates:</strong> ${(booking as FarmStayBooking).checkin} to ${
      (booking as FarmStayBooking).checkout
    }</p>
      <p><strong>Room Type:</strong> ${
        (booking as FarmStayBooking).roomType
      }</p>
      <p><strong>Guests:</strong> ${(booking as FarmStayBooking).guests}</p>
      ${
        (booking as FarmStayBooking).specialRequests
          ? `<p><strong>Special Requests:</strong> ${
              (booking as FarmStayBooking).specialRequests
            }</p>`
          : ''
      }
    `,
    'farm-visit': `
      <h3>New Farm Visit Booking</h3>
      <p><strong>Booking ID:</strong> ${bookingId}</p>
      <p><strong>Name:</strong> ${booking.name}</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      <p><strong>Package:</strong> ${
        (booking as FarmVisitBooking).packageName
      }</p>
      <p><strong>Price:</strong> ₹${
        (booking as FarmVisitBooking).packagePrice
      }</p>
      <p><strong>Total:</strong> ₹${
        (booking as FarmVisitBooking).totalAmount
      }</p>
      <p><strong>Date:</strong> ${(booking as FarmVisitBooking).checkin}</p>
      ${
        (booking as FarmVisitBooking).specialRequests
          ? `<p><strong>Special Requests:</strong> ${
              (booking as FarmVisitBooking).specialRequests
            }</p>`
          : ''
      }
    `,
    'school-trip': `
      <h3>New School Trip Booking</h3>
      <p><strong>Booking ID:</strong> ${bookingId}</p>
      <p><strong>School:</strong> ${
        (booking as SchoolTripBooking).schoolName
      }</p>
      <p><strong>Contact Person:</strong> ${
        (booking as SchoolTripBooking).contactPerson
      }</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      <p><strong>Students:</strong> ${
        (booking as SchoolTripBooking).studentCount
      }</p>
      <p><strong>Date:</strong> ${(booking as SchoolTripBooking).tripDate}</p>
      <p><strong>Program:</strong> ${
        (booking as SchoolTripBooking).programType
      }</p>
      ${
        (booking as SchoolTripBooking).specialRequirements
          ? `<p><strong>Special Requirements:</strong> ${
              (booking as SchoolTripBooking).specialRequirements
            }</p>`
          : ''
      }
    `,
    photoshoot: `
      <h3>New Photoshoot Booking</h3>
      <p><strong>Booking ID:</strong> ${bookingId}</p>
      <p><strong>Name:</strong> ${booking.name}</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      <p><strong>Package:</strong> ${
        (booking as PhotoshootBooking).packageType
      }</p>
      <p><strong>Date:</strong> ${(booking as PhotoshootBooking).date}</p>
      <p><strong>Time:</strong> ${(booking as PhotoshootBooking).time}</p>
      <p><strong>Participants:</strong> ${
        (booking as PhotoshootBooking).participants
      }</p>
      ${
        (booking as PhotoshootBooking).specialRequests
          ? `<p><strong>Special Requests:</strong> ${
              (booking as PhotoshootBooking).specialRequests
            }</p>`
          : ''
      }
    `,
  };

  const bookingDetail =
    details[bookingType as keyof typeof details] ||
    '<p>Booking details not available</p>';
  const displayName =
    booking.name || (booking as SchoolTripBooking).contactPerson || 'Customer';

  const mailOptions = {
    from: '"Thamizh Nilam Bookings" <bookings@thamizhnilam.com>',
    to: ADMIN_EMAIL,
    subject: `New ${bookingType} Booking - ${displayName}`,
    html: `${bookingDetail}`,
  };

  return transporter.sendMail(mailOptions);
}

// ======================
// FEEDBACK FUNCTIONS
// ======================

export const sendFeedbackEmails = onSchedule(
  {
    schedule: '0 22 * * *', // Every day at 10 PM (22:00)
    timeZone: 'Asia/Kolkata',
    secrets: [emailUser, emailPass],
  },
  async () => {
    const today = formatDate(new Date());

    try {
      // Process all booking types in parallel
      await Promise.all([
        processFarmStayFeedback(today),
        processFarmVisitFeedback(today),
        processSchoolTripFeedback(today),
        processPhotoshootFeedback(today),
      ]);

      logger.log('Feedback email processing completed successfully');
    } catch (error) {
      logger.error('Error in feedback email processing:', error);
      await sendErrorNotification(error);
    }
  }
);

async function processFarmStayFeedback(today: string) {
  const snapshot = await admin
    .firestore()
    .collection('farm-stay-bookings')
    .where('checkout', '==', today)
    .where('feedbackSent', '!=', true)
    .get();

  logger.log(`Found ${snapshot.size} farm-stay bookings for feedback`);

  const promises = snapshot.docs.map(async (doc) => {
    const booking = doc.data() as FarmStayBooking;

    try {
      await sendFeedbackEmail(booking, 'farm-stay', doc.id);
      await doc.ref.update({ feedbackSent: true });
      logger.log(`Feedback sent for farm-stay booking ${doc.id}`);
    } catch (error) {
      logger.error(
        `Failed to send feedback for farm-stay booking ${doc.id}:`,
        error
      );
    }
  });

  return Promise.all(promises);
}

async function processFarmVisitFeedback(today: string) {
  const snapshot = await admin
    .firestore()
    .collection('farm-visit-bookings')
    .where('checkin', '==', today)
    .where('feedbackSent', '!=', true)
    .get();

  logger.log(`Found ${snapshot.size} farm-visit bookings for feedback`);

  const promises = snapshot.docs.map(async (doc) => {
    const booking = doc.data() as FarmVisitBooking;

    try {
      await sendFeedbackEmail(booking, 'farm-visit', doc.id);
      await doc.ref.update({ feedbackSent: true });
      logger.log(`Feedback sent for farm-visit booking ${doc.id}`);
    } catch (error) {
      logger.error(
        `Failed to send feedback for farm-visit booking ${doc.id}:`,
        error
      );
    }
  });

  return Promise.all(promises);
}

async function processSchoolTripFeedback(today: string) {
  const snapshot = await admin
    .firestore()
    .collection('school-trip-bookings')
    .where('tripDate', '==', today)
    .where('feedbackSent', '!=', true)
    .get();

  logger.log(`Found ${snapshot.size} school-trip bookings for feedback`);

  const promises = snapshot.docs.map(async (doc) => {
    const booking = doc.data() as SchoolTripBooking;

    try {
      await sendFeedbackEmail(booking, 'school-trip', doc.id);
      await doc.ref.update({ feedbackSent: true });
      logger.log(`Feedback sent for school-trip booking ${doc.id}`);
    } catch (error) {
      logger.error(
        `Failed to send feedback for school-trip booking ${doc.id}:`,
        error
      );
    }
  });

  return Promise.all(promises);
}

async function processPhotoshootFeedback(today: string) {
  const snapshot = await admin
    .firestore()
    .collection('photoshoot-bookings')
    .where('date', '==', today)
    .where('feedbackSent', '!=', true)
    .get();

  logger.log(`Found ${snapshot.size} photoshoot bookings for feedback`);

  const promises = snapshot.docs.map(async (doc) => {
    const booking = doc.data() as PhotoshootBooking;

    try {
      await sendFeedbackEmail(booking, 'photoshoot', doc.id);
      await doc.ref.update({ feedbackSent: true });
      logger.log(`Feedback sent for photoshoot booking ${doc.id}`);
    } catch (error) {
      logger.error(
        `Failed to send feedback for photoshoot booking ${doc.id}:`,
        error
      );
    }
  });

  return Promise.all(promises);
}

async function sendFeedbackEmail(
  booking: BaseBooking,
  bookingType: string,
  bookingId: string
) {
  const typeNames: Record<string, string> = {
    'farm-stay': 'Farm Stay',
    'farm-visit': 'Farm Visit',
    'school-trip': 'School Trip',
    photoshoot: 'Photoshoot',
  };

  const displayType = typeNames[bookingType] || 'Experience';
  const customerName =
    booking.name ||
    (booking as SchoolTripBooking).contactPerson ||
    'Valued Customer';

  const mailOptions = {
    from: `"Thamizh Nilam Feedback" <${SUPPORT_EMAIL}>`,
    to: booking.email,
    bcc: ADMIN_EMAIL,
    subject: `Share Your ${displayType} Experience`,
    html: `
      <p>Dear ${customerName},</p>
      <p>Thank you for your recent ${displayType.toLowerCase()} with Thamizh Nilam!</p>
      <p>We would love to hear about your experience. Please take a moment to share your feedback:</p>
      <p><a href="${FEEDBACK_LINK}?type=${bookingType}&bookingId=${bookingId}" style="
        display: inline-block;
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        margin: 10px 0;
      ">Share Your Feedback</a></p>
      <p>Your feedback helps us improve our services.</p>
      <p>Thank you,<br>The Thamizh Nilam Team</p>
    `,
    text: `
      Dear ${customerName},

      Thank you for your recent ${displayType.toLowerCase()} with Thamizh Nilam!

      We would love to hear about your experience. Please take a moment to share your feedback:

      ${FEEDBACK_LINK}?type=${bookingType}&bookingId=${bookingId}

      Your feedback helps us improve our services.

      Thank you,
      The Thamizh Nilam Team
    `,
  };

  return transporter.sendMail(mailOptions);
}

async function sendErrorNotification(error: unknown) {
  const errorMessage =
    error instanceof Error ? error.message : 'Unknown error occurred';
  const stackTrace =
    error instanceof Error ? error.stack : 'No stack trace available';

  const mailOptions = {
    from: `"Thamizh Nilam Error Alert" <${SUPPORT_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject: 'Feedback System Error Notification',
    text: `
      The feedback email system encountered an error:
      
      Error: ${errorMessage}
      
      Stack Trace:
      ${stackTrace}
      
      Please investigate immediately.
    `,
    html: `
      <h2>Feedback System Error Notification</h2>
      <p>The feedback email system encountered an error:</p>
      <p><strong>Error:</strong> ${errorMessage}</p>
      <h3>Stack Trace:</h3>
      <pre>${stackTrace}</pre>
      <p>Please investigate immediately.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ======================
// TRIGGER FUNCTIONS (V2 Syntax)
// ======================

export const farmStayBooking = onDocumentCreated(
  {
    document: 'farm-stay-bookings/{bookingId}',
    region: 'asia-south1',
    secrets: [emailUser, emailPass],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error('No data associated with the event');
      return;
    }
    const booking = snapshot.data() as FarmStayBooking;
    await processBooking('farm-stay', booking, event.params.bookingId);
  }
);

export const farmVisitBooking = onDocumentCreated(
  {
    document: 'farm-visit-bookings/{bookingId}',
    region: 'asia-south1',
    secrets: [emailUser, emailPass],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error('No data associated with the event');
      return;
    }
    const booking = snapshot.data() as FarmVisitBooking;
    await processBooking('farm-visit', booking, event.params.bookingId);
  }
);

export const schoolTripBooking = onDocumentCreated(
  {
    document: 'school-trip-bookings/{bookingId}',
    region: 'asia-south1',
    secrets: [emailUser, emailPass],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error('No data associated with the event');
      return;
    }
    const booking = snapshot.data() as SchoolTripBooking;
    await processBooking('school-trip', booking, event.params.bookingId);
  }
);

export const photoshootBooking = onDocumentCreated(
  {
    document: 'photoshoot-bookings/{bookingId}',
    region: 'asia-south1',
    secrets: [emailUser, emailPass],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error('No data associated with the event');
      return;
    }
    const booking = snapshot.data() as PhotoshootBooking;
    await processBooking('photoshoot', booking, event.params.bookingId);
  }
);
