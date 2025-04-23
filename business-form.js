function submitForm(event) {
    event.preventDefault(); // Prevent form from refreshing the page

    // Get form values
    const companyName = document.getElementById('companyName').value;
    const electricityUsage = document.getElementById('electricityUsage').value;
    const companyAddress = document.getElementById('companyAddress').value;
    const phoneNumber = document.getElementById('phoneNumber').value;

    // Here you would typically send the data to a server
    // For now, we'll just log it and show the success message
    console.log('Form submitted:', {
        companyName,
        electricityUsage,
        companyAddress,
        phoneNumber
    });

    // Hide form and show success message
    document.getElementById('businessForm').style.display = 'none';
    document.getElementById('message').style.display = 'block';
    document.getElementById('message').scrollIntoView({ behavior: 'smooth' });


}

// Initialize form submission
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('businessForm').addEventListener('submit', submitForm);
});