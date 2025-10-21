import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import BusPassTemplate from '../components/BusPassTemplate';
import { FaArrowLeft, FaPrint, FaShare, FaDownload } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { downloadBusPass } from '../utils/downloadPass';

function BusPassDisplay() {
  const { regNo } = useParams();
  const location = useLocation();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Check if data is passed via location state (from QR scan)
    if (location.state && location.state.studentData) {
      setStudentData(location.state.studentData);
      setLoading(false);
      return;
    }

    // If no data in state, try to fetch from API using regNo
    if (regNo) {
      fetchStudentData();
    } else {
      setError('No student data provided');
      setLoading(false);
    }
  }, [regNo, location.state]);

  const fetchStudentData = async () => {
    try {
      const response = await fetch(`/api/student/pass/${regNo}`);
      if (!response.ok) {
        throw new Error('Student not found or not approved');
      }
      const data = await response.json();
      
      // Transform the data to match our template format
      const transformedData = {
        name: data.name || 'Full Name',
        regNo: data.regNo || regNo,
        route: data.route || 'Main Route',
        validTill: data.validity || data.validTill || 'N/A',
        approvedAt: data.approvedAt,
        photo: data.photo || null,
        branch: data.branch || data.branchYear || 'Branch',
        year: data.year || (data.branchYear ? data.branchYear.split(' ')[0] : 'Year'),
        college: data.college || 'Your College Name',
        address: data.address || data.collegeAddress || 'College Address',
        dob: data.dob || 'DD-MM-YYYY',
        mobile: data.mobile || 'N/A'
      };
      
      setStudentData(transformedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Student Bus Pass',
          text: `Bus pass for ${studentData.name}`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDownload = async () => {
    try {
      setError(null);
      setIsDownloading(true);
      await downloadBusPass('bus-pass-template', `bus-pass-${studentData.regNo}`);
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download bus pass: ' + (error.message || 'Please try again.'));
    } finally {
      setIsDownloading(false);
    }
  };

  const goBack = () => {
    window.history.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bus pass...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={goBack}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goBack}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Student Bus Pass</h1>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
              >
                <FaDownload className="mr-2" />
                {isDownloading ? 'Downloading...' : 'Download JPEG'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
              >
                <FaPrint className="mr-2" />
                Print
              </button>
              <button
                onClick={handleShare}
                className="flex items-center bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition-colors"
              >
                <FaShare className="mr-2" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Bus Pass Display */}
        <div className="flex justify-center">
          <BusPassTemplate studentData={studentData} />
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Pass Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Student Name</p>
              <p className="font-semibold">{studentData.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Registration Number</p>
              <p className="font-semibold">{studentData.regNo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Route</p>
              <p className="font-semibold">{studentData.route}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Valid Until</p>
              <p className="font-semibold">{studentData.validity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">College</p>
              <p className="font-semibold">ACE / MGR College / APTC</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Course</p>
              <p className="font-semibold">{studentData.branchYear || 'II nd year / Computer Science and Engineering'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default BusPassDisplay;
