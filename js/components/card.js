// Card component

// Function to create a card element
function createCard(title, description, imageUrl) {
    const card = document.createElement('div');
    card.className = 'card';

    const img = document.createElement('img');
    img.className = 'card-img';
    img.src = imageUrl;
    img.alt = title;

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    const cardTitle = document.createElement('h3');
    cardTitle.className = 'card-title';
    cardTitle.textContent = title;

    const cardText = document.createElement('p');
    cardText.className = 'card-text';
    cardText.textContent = description;

    cardBody.appendChild(cardTitle);
    cardBody.appendChild(cardText);

    card.appendChild(img);
    card.appendChild(cardBody);

    // Add click event listener to navigate to details page
    card.addEventListener('click', () => {
        loadDetailsPage();
    });

    return card;
}

// Function to create a skeleton card
function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'card skeleton';

    const img = document.createElement('div');
    img.className = 'card-img skeleton';
    img.style.height = '150px';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    const cardTitle = document.createElement('div');
    cardTitle.className = 'card-title skeleton';
    cardTitle.style.height = '20px';
    cardTitle.style.width = '80%';

    const cardText = document.createElement('div');
    cardText.className = 'card-text skeleton';
    cardText.style.height = '15px';
    cardText.style.width = '60%';

    cardBody.appendChild(cardTitle);
    cardBody.appendChild(cardText);

    card.appendChild(img);
    card.appendChild(cardBody);

    return card;
}