// Slider component

// Function to create a slider element
function createSlider() {
    const slider = document.createElement('div');
    slider.className = 'slider skeleton';

    // Create skeleton cards
    for (let i = 0; i < 5; i++) {
        const skeletonCard = createSkeletonCard();
        slider.appendChild(skeletonCard);
    }

    return slider;
}

// Function to update slider with actual cards
function updateSlider(slider, cards) {
    // Clear skeleton cards
    slider.innerHTML = '';

    // Add actual cards
    cards.forEach(card => {
        slider.appendChild(card);
    });
}