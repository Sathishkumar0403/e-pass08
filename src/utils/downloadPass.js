import html2canvas from 'html2canvas';

export const downloadBusPass = async (elementId, filename = 'bus-pass') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Bus pass element not found');
    }

    // Wait for images to load
    const images = element.getElementsByTagName('img');
    await Promise.all([...images].map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
    }));

    // Create canvas from the element
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 3, 
      useCORS: true,
      logging: false,
      width: element.offsetWidth,
      height: element.offsetHeight,
      imageTimeout: 15000,
    });

    // Convert canvas to PNG blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob'));
          return;
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.png`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }, 'image/png');
    });
  } catch (error) {
    console.error('Error downloading bus pass:', error);
    throw error;
  }
};

export const downloadAsPDF = async (elementId, filename = 'bus-pass') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Bus pass element not found');
    }

    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create canvas from the element
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: element.offsetWidth,
      height: element.offsetHeight,
      imageTimeout: 5000
    });

    // Convert canvas to blob and then to PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // For PDF generation, we'll use a simple approach
    // In a real application, you might want to use jsPDF or similar library
    const link = document.createElement('a');
    link.href = imgData;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.jpg`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Error downloading bus pass as PDF:', error);
    throw error;
  }
};
