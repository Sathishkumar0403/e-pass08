import React, { useState } from 'react';
import { FaUser, FaCalendarAlt, FaIdCard, FaGraduationCap, FaPhone, FaUserFriends, FaHome, FaBus, FaImage, FaIdBadge, FaUserGraduate } from 'react-icons/fa';
import styles from './StudentForm.module.css';
import { applyStudent } from '../utils/api';

function StudentForm() {
  const [form, setForm] = useState({
    name: '', dob: '', regNo: '', branchYear: '', mobile: '', parentMobile: '', address: '', route: '', validity: '', photo: null, aadharNumber: '', aadharPhoto: null, collegeIdPhoto: null, college: '', busNo: '', userType: 'student',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'photo' || name === 'aadharPhoto' || name === 'collegeIdPhoto') {
      if (files && files.length > 0) {
        setForm({ ...form, [name]: files[0] });
      } else {
        setForm({ ...form, [name]: null });
      }
    } else if (name === 'userType') {
      setForm({ ...form, userType: value });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleRemoveFile = (field) => {
    setForm({ ...form, [field]: null });
    // Also clear the file input value
    if (fileInputs[field]) fileInputs[field].value = '';
  };

  // Refs for file inputs to clear them
  const fileInputs = {};

  const handleFileInputRef = (ref, field) => {
    if (ref) fileInputs[field] = ref;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); 
    setError('');
    setIsSubmitting(true);
    
    // Validate required text fields
    if (!form.name || !form.dob || !form.regNo || !form.branchYear || !form.mobile || !form.parentMobile || !form.address || !form.route || !form.validity || !form.aadharNumber || !form.college || !form.busNo || !form.userType) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }
    
    // Validate required images
    if (!form.photo || !form.aadharPhoto || !form.collegeIdPhoto) {
      setError('Please upload all required images (Photo, Aadhar Photo, and College ID Photo)');
      setIsSubmitting(false);
      return;
    }
    
    // Validate mobile number format
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(form.mobile) || !mobileRegex.test(form.parentMobile)) {
      setError('Please enter valid 10-digit mobile numbers starting with 6-9');
      setIsSubmitting(false);
      return;
    }
    
    try {
      console.log('Submitting form data:', form);
      const res = await applyStudent(form);
      console.log('Response from server:', res);
      
      if (res.message === 'Application submitted successfully') {
        setMessage('Application submitted successfully!');
        setForm({ name: '', dob: '', regNo: '', branchYear: '', mobile: '', parentMobile: '', address: '', route: '', validity: '', photo: null, aadharNumber: '', aadharPhoto: null, collegeIdPhoto: null, college: '', busNo: '', userType: 'student' });
        // Clear file inputs
        Object.keys(fileInputs).forEach(key => {
          if (fileInputs[key]) fileInputs[key].value = '';
        });
      } else {
        setError(res.error || 'Submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setError(error.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={`${styles.form} ${isSubmitting ? styles.loading : ''}`} onSubmit={handleSubmit}>
      <h2 className={styles.title}>Student Bus Pass Application Form</h2>
      <div className={styles.fieldGroup}>
        <label htmlFor="name" className={styles.label}><FaUser style={{ marginRight: 6, color: '#6366f1' }} />Name</label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="Enter your name"
          value={form.name}
          onChange={handleChange}
          required
          className={styles.input}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="dob" className={styles.label}><FaCalendarAlt style={{ marginRight: 6, color: '#818cf8' }} />Date of Birth</label>
        <input
          type="date"
          id="dob"
          name="dob"
          value={form.dob}
          onChange={handleChange}
          required
          className={styles.input}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="regNo" className={styles.label}><FaIdCard style={{ marginRight: 6, color: '#0ea5e9' }} />Register Number</label>
        <input
          type="text"
          id="regNo"
          name="regNo"
          placeholder="Enter register number"
          value={form.regNo}
          onChange={handleChange}
          required
          className={styles.input}
        />
      </div>
       <div className={styles.fieldGroup}>
        <label htmlFor="college" className={styles.label}><FaUser style={{ marginRight: 6, color: '#6366f1' }} />College Name</label>
        <input
          type="text"
          id="college"
          name="college"
          placeholder="Enter your college name"
          value={form.college}
          onChange={handleChange}
          required
          className={styles.input}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="branchYear" className={styles.label}><FaGraduationCap style={{ marginRight: 6, color: '#f59e42' }} />Branch and Year</label>
        <input
          type="text"
          id="branchYear"
          name="branchYear"
          placeholder="e.g. CSE - 3rd Year"
          value={form.branchYear}
          onChange={handleChange}
          required
          className={styles.input}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="mobile" className={styles.label}><FaPhone style={{ marginRight: 6, color: '#22c55e' }} />Mobile Number</label>
        <input
          type="tel"
          id="mobile"
          name="mobile"
          placeholder="Enter your mobile number"
          value={form.mobile}
          onChange={handleChange}
          required
          className={styles.input}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="parentMobile" className={styles.label}><FaUserFriends style={{ marginRight: 6, color: '#f43f5e' }} />Parent's Mobile Number</label>
        <input
          type="tel"
          id="parentMobile"
          name="parentMobile"
          placeholder="Enter parent's mobile number"
          value={form.parentMobile}
          onChange={handleChange}
          required
          className={styles.input}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="address" className={styles.label}><FaHome style={{ marginRight: 6, color: '#a3e635' }} />Address</label>
        <textarea
          id="address"
          name="address"
          rows="3"
          placeholder="Enter your address"
          value={form.address}
          onChange={handleChange}
          required
          className={styles.input}
        ></textarea>
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="route" className={styles.label}><FaBus style={{ marginRight: 6, color: '#fbbf24' }} />Route</label>
        <input
          type="text"
          id="route"
          name="route"
          placeholder="e.g. Ace to Hosur"
          value={form.route}
          onChange={handleChange}
          required
          className={styles.input}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="validity" className={styles.label}><FaCalendarAlt style={{ marginRight: 6, color: '#818cf8' }} />Validity (Month)</label>
        <input
          type="month"
          id="validity"
          name="validity"
          value={form.validity}
          onChange={handleChange}
          required
          className={styles.input}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="busNo" className={styles.label}><FaBus style={{ marginRight: 6, color: '#fbbf24' }} />Bus Number</label>
        <select
          id="busNo"
          name="busNo"
          value={form.busNo}
          onChange={handleChange}
          required
          className={styles.input}
        >
          <option value="">Select a bus number</option>
          <option value="101">101</option>
          <option value="102">102</option>
          <option value="103">103</option>
          <option value="104">104</option>
        </select>
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="userType" className={styles.label}><FaUserGraduate style={{ marginRight: 6, color: '#6366f1' }} />Application Type</label>
        <select
          id="userType"
          name="userType"
          value={form.userType}
          onChange={handleChange}
          required
          className={styles.input}
        >
          <option value="student">Student</option>
          <option value="staff">Staff</option>
        </select>
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="photo" className={styles.label}><FaImage style={{ marginRight: 6, color: '#6366f1' }} />Upload Photo</label>
      <div className={styles.fileInputRow}>
        <input
          type="file"
          id="photo"
          name="photo"
          accept="image/*"
          onChange={handleChange}
          className={styles.input}
          ref={ref => handleFileInputRef(ref, 'photo')}
        />
        {form.photo && (
          <div className={styles.fileInputWrapper}>
            <div className={styles.fileName}>
              {form.photo.name}
            </div>
            <button type="button" className={styles.removeButton} onClick={() => handleRemoveFile('photo')}>
              Remove
            </button>
          </div>
        )}
      </div>
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="aadharNumber" className={styles.label}><FaIdBadge style={{ marginRight: 6, color: '#f59e42' }} />Aadhar Card Number</label>
        <input
          type="text"
          id="aadharNumber"
          name="aadharNumber"
          placeholder="Enter your Aadhar card number"
          value={form.aadharNumber}
          onChange={handleChange}
          required
          className={styles.input}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="aadharPhoto" className={styles.label}><FaImage style={{ marginRight: 6, color: '#6366f1' }} />Upload Aadhar Card Photo</label>
      <div className={styles.fileInputRow}>
        <input
          type="file"
          id="aadharPhoto"
          name="aadharPhoto"
          accept="image/*"
          onChange={handleChange}
          className={styles.input}
          ref={ref => handleFileInputRef(ref, 'aadharPhoto')}
        />
        {form.aadharPhoto && (
          <div className={styles.fileInputWrapper}>
            <div className={styles.fileName}>
              {form.aadharPhoto.name}
            </div>
            <button type="button" className={styles.removeButton} onClick={() => handleRemoveFile('aadharPhoto')}>
              Remove
            </button>
          </div>
        )}
      </div>
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="collegeIdPhoto" className={styles.label}><FaImage style={{ marginRight: 6, color: '#6366f1' }} />Upload College ID Card Photo or tution fee bill</label>
      <div className={styles.fileInputRow}>
        <input
          type="file"
          id="collegeIdPhoto"
          name="collegeIdPhoto"
          accept="image/*"
          onChange={handleChange}
          className={styles.input}
          ref={ref => handleFileInputRef(ref, 'collegeIdPhoto')}
        />
        {form.collegeIdPhoto && (
          <div className={styles.fileInputWrapper}>
            <div className={styles.fileName}>
              {form.collegeIdPhoto.name}
            </div>
            <button type="button" className={styles.removeButton} onClick={() => handleRemoveFile('collegeIdPhoto')}>
              Remove
            </button>
          </div>
        )}
      </div>
      </div>
      <div className={styles.buttonGroup}>
        <button type="submit" className={styles.button} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}
    </form>
  );
}

export default StudentForm;
  