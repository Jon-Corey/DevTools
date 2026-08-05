const searchInput = document.getElementById('search');
const statusesList = document.getElementById('statuses');

initialize();

function initialize() {
    // Add event listeners
    searchInput.addEventListener('input', filterStatuses);
}

// Event handlers

function filterStatuses() {
    const query = searchInput.value.toLowerCase();
    const statusItems = statusesList.getElementsByTagName('li');
    for (let item of statusItems) {
        // Check if the title or description contains the query
        const title = item.querySelector('strong').textContent.toLowerCase();
        const description = item.querySelector('p').textContent.toLowerCase();
        item.style.display = title.includes(query) || description.includes(query) ? '' : 'none';
    }
}
