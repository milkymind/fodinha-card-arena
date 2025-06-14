import React, { useState } from 'react';

interface BugReportModalProps {
  gameId?: string;
  playerId?: number;
}

interface BugReportData {
  bugDescription: string;
  stepsToReproduce: string;
  gameId?: string;
  playerId?: number;
  userAgent: string;
  timestamp: string;
}

const BugReportModal: React.FC<BugReportModalProps> = ({ gameId, playerId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const openModal = () => {
    setIsOpen(true);
    setMessage('');
    setMessageType('');
  };

  const closeModal = () => {
    setIsOpen(false);
    setBugDescription('');
    setStepsToReproduce('');
    setMessage('');
    setMessageType('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bugDescription.trim()) {
      setMessage('Bug description is required');
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('Sending bug report...');
    setMessageType('');

    const bugReportData: BugReportData = {
      bugDescription: bugDescription.trim(),
      stepsToReproduce: stepsToReproduce.trim(),
      gameId,
      playerId,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/report-bug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bugReportData),
      });

      if (response.ok) {
        setMessage('Bug report sent successfully! Thank you for helping us improve the game.');
        setMessageType('success');
        
        // Auto-close modal after 2 seconds on success
        setTimeout(() => {
          closeModal();
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to send bug report. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      setMessage('Network error. Please check your connection and try again.');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Bug Report Button */}
      <button
        onClick={openModal}
        className="fixed bottom-4 right-4 bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105 z-40"
        title="Report a Bug"
        aria-label="Report a Bug"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Report a Bug</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6">
              {/* Bug Description Field */}
              <div className="mb-4">
                <label
                  htmlFor="bugDescription"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Bug Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="bugDescription"
                  value={bugDescription}
                  onChange={(e) => setBugDescription(e.target.value)}
                  placeholder="Briefly describe the issue you encountered..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  rows={4}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Steps to Reproduce Field */}
              <div className="mb-6">
                <label
                  htmlFor="stepsToReproduce"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Steps to Reproduce (Optional)
                </label>
                <textarea
                  id="stepsToReproduce"
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  placeholder="1. First, I did...&#10;2. Then, I clicked...&#10;3. Finally, the bug occurred when..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  rows={4}
                  disabled={isSubmitting}
                />
              </div>

              {/* Message Display Area */}
              {message && (
                <div
                  className={`mb-4 p-3 rounded-md text-sm ${
                    messageType === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : messageType === 'error'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 border border-transparent rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={isSubmitting || !bugDescription.trim()}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default BugReportModal; 