'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

interface TimeSlot {
  date: string;
  times: string[];
}

interface BookingData {
  student_email: string;
  student_name: string;
  project_name: string;
  role: string;
  availability_slots: TimeSlot[];
  booking_token: string;
}

export default function CalendarBookingPage() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Get booking data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const data = {
      student_email: urlParams.get('email') || '',
      student_name: urlParams.get('name') || '',
      project_name: urlParams.get('project') || '',
      role: urlParams.get('role') || '',
      availability_slots: JSON.parse(urlParams.get('slots') || '[]'),
      booking_token: urlParams.get('token') || ''
    };
    
    setBookingData(data);
  }, []);

  const handleTimeSlotClick = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleBookingSubmit = async () => {
    if (!bookingData || !selectedDate || !selectedTime) {
      setErrorMessage('Please select a date and time');
      return;
    }

    setIsBooking(true);
    setBookingStatus('booking');
    setErrorMessage('');

    try {
      const response = await fetch('/api/calendar/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_email: bookingData.student_email,
          student_name: bookingData.student_name,
          project_name: bookingData.project_name,
          role: bookingData.role,
          selected_date: selectedDate,
          selected_time: selectedTime,
          booking_token: bookingData.booking_token
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBookingStatus('success');
      } else {
        setBookingStatus('error');
        setErrorMessage(result.message || 'Booking failed');
      }
    } catch (error) {
      setBookingStatus('error');
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Booking Link</h2>
            <p className="text-gray-600">This booking link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bookingStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Interview Booked Successfully!</h2>
            <p className="text-gray-600 mb-4">
              Your interview for <strong>{bookingData.role}</strong> on <strong>{bookingData.project_name}</strong> has been scheduled.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Date:</strong> {selectedDate}<br />
                <strong>Time:</strong> {selectedTime}
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              You will receive a confirmation email with calendar invite shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-blue-600">
              Schedule Your Interview
            </CardTitle>
            <p className="text-gray-600">
              {bookingData.role} - {bookingData.project_name}
            </p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Calendar View */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Available Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingData.availability_slots.map((slot, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-3 text-blue-600">
                      {slot.date}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {slot.times.map((time, timeIndex) => (
                        <Button
                          key={timeIndex}
                          variant={selectedDate === slot.date && selectedTime === time ? "default" : "outline"}
                          className={`w-full justify-start ${
                            selectedDate === slot.date && selectedTime === time
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-blue-50'
                          }`}
                          onClick={() => handleTimeSlotClick(slot.date, time)}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{bookingData.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{bookingData.student_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Position:</span>
                  <span className="font-medium">{bookingData.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Project:</span>
                  <span className="font-medium">{bookingData.project_name}</span>
                </div>
              </div>

              {selectedDate && selectedTime && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Selected Interview Time:</h4>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{selectedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{errorMessage}</p>
                </div>
              )}

              <Button
                onClick={handleBookingSubmit}
                disabled={!selectedDate || !selectedTime || isBooking}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isBooking ? 'Booking...' : 'Confirm Interview Time'}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                By confirming, you agree to attend the interview at the selected time.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
