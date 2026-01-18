// Life Fixer Heatmap
// Fetches data.json and renders GitHub-style contribution heatmap

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function loadData() {
    try {
        const response = await fetch('data.json?' + Date.now()); // Cache bust
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading data:', error);
        return getEmptyData();
    }
}

function getEmptyData() {
    return {
        stats: {
            current_streak: 0,
            longest_streak: 0,
            total_responses: 0,
            last_updated: null
        },
        activity: {}
    };
}

function getActivityLevel(responses) {
    // 0 responses = level 0
    // 1-2 responses = level 1
    // 3-4 responses = level 2
    // 5 responses = level 3
    // 6 responses = level 4
    if (responses === 0) return 0;
    if (responses <= 2) return 1;
    if (responses <= 4) return 2;
    if (responses === 5) return 3;
    return 4;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    // Adjust to Sunday as start of week
    const diff = d.getDate() - day;
    d.setDate(diff);
    return d;
}

function generateHeatmap(data) {
    const heatmap = document.getElementById('heatmap');
    const monthsHeader = document.getElementById('months-header');
    heatmap.innerHTML = '';
    monthsHeader.innerHTML = '';

    const today = new Date();
    const startDate = new Date(today.getFullYear(), 0, 1); // Jan 1st of current year

    // Adjust start to the Sunday of that week
    const startDay = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDay);

    // Calculate end date (today or end of year, whichever is earlier)
    const endDate = new Date(Math.min(today.getTime(), new Date(today.getFullYear(), 11, 31).getTime()));

    let currentMonth = -1;
    let weekCount = 0;
    const monthPositions = [];

    // Iterate through each day
    let currentDate = new Date(startDate);
    while (currentDate <= endDate || currentDate.getDay() !== 0) {
        if (currentDate > endDate && currentDate.getDay() === 0) break;

        const dateStr = formatDate(currentDate);
        const dayOfWeek = currentDate.getDay();
        const month = currentDate.getMonth();

        // Track month positions
        if (dayOfWeek === 0 && month !== currentMonth) {
            monthPositions.push({ month: month, week: weekCount });
            currentMonth = month;
        }

        // Create day cell
        const dayEl = document.createElement('div');
        dayEl.className = 'day';

        // Only add data for dates within the current year and not in the future
        if (currentDate >= new Date(today.getFullYear(), 0, 1) && currentDate <= today) {
            const responses = data.activity[dateStr] || 0;
            const level = getActivityLevel(responses);
            dayEl.classList.add(`level-${level}`);
            dayEl.setAttribute('data-date', dateStr);
            dayEl.setAttribute('data-responses', responses);

            // Add tooltip on hover
            dayEl.addEventListener('mouseenter', showTooltip);
            dayEl.addEventListener('mouseleave', hideTooltip);
        }

        heatmap.appendChild(dayEl);

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);

        if (dayOfWeek === 6) weekCount++;
    }

    // Generate month headers
    monthPositions.forEach((pos, index) => {
        const span = document.createElement('span');
        span.textContent = MONTHS[pos.month];
        span.style.marginLeft = index === 0 ? '0' : `${(pos.week - (monthPositions[index-1]?.week || 0)) * 14 - 28}px`;
        monthsHeader.appendChild(span);
    });
}

function showTooltip(e) {
    const date = e.target.getAttribute('data-date');
    const responses = e.target.getAttribute('data-responses');

    if (!date) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerHTML = `<strong>${responses} reflection${responses !== '1' ? 's' : ''}</strong><br>${formatDisplayDate(date)}`;

    document.body.appendChild(tooltip);

    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width/2 - tooltip.offsetWidth/2}px`;
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
}

function hideTooltip() {
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(t => t.remove());
}

function formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function updateStats(data) {
    document.getElementById('current-streak').textContent = data.stats.current_streak || 0;
    document.getElementById('longest-streak').textContent = data.stats.longest_streak || 0;
    document.getElementById('total-responses').textContent = data.stats.total_responses || 0;

    // Calculate year progress
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    const yearProgress = Math.round(((today - startOfYear) / (endOfYear - startOfYear)) * 100);
    document.getElementById('year-progress').textContent = yearProgress + '%';

    // Calculate week responses
    const weekStart = getWeekStart(today);
    let weekResponses = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const dateStr = formatDate(d);
        if (data.activity[dateStr] && data.activity[dateStr] > 0) {
            weekResponses++;
        }
    }
    document.getElementById('week-responses').textContent = weekResponses;

    // Last updated
    if (data.stats.last_updated) {
        const lastUpdated = new Date(data.stats.last_updated);
        document.getElementById('last-updated').textContent = lastUpdated.toLocaleString();
    }
}

async function init() {
    const data = await loadData();
    generateHeatmap(data);
    updateStats(data);
}

// Run on load
init();

// Refresh every 5 minutes
setInterval(init, 5 * 60 * 1000);
