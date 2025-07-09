document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    let isTransitioning = false; // prevent rapid-fire clicks
    // apply fade-in animations to elements
    const initPageAnimations = () => {
        const fadeInElements = mainContent.querySelectorAll('.fade-in');
        if (fadeInElements.length > 0) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    }
                });
            }, { threshold: 0.1 });
            fadeInElements.forEach(el => observer.observe(el));
        }
    };
    // update active state of navigation links
    const updateActiveNav = (path) => {
        const navLinks = document.querySelectorAll('.nav__link');
        navLinks.forEach(link => {
            // Normalize paths for comparison
            const linkPath = new URL(link.href).pathname;
            if (linkPath === path) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    };
    // load page content dynamically (for transitions)
    const loadPage = async (url) => {
        // Prevent new transitions if one is already in progress
        if (isTransitioning) return;
        isTransitioning = true;
        // 1. Fade out the current content
        mainContent.classList.add('fade-out');
        try {
            // 2. Fetch the new page's HTML
            const response = await fetch(url);
            const text = await response.text();
            // 3. Create a temporary container to parse the new HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            const newMainContent = tempDiv.querySelector('#main-content').innerHTML;
            const newTitle = tempDiv.querySelector('title').innerText;
            // 4. Wait for fade-out, then swap content and fade in
            mainContent.addEventListener('transitionend', async () => {
                mainContent.innerHTML = newMainContent;
                document.title = newTitle;
                // Reset scroll position to the top for the new page
                window.scrollTo(0, 0); 
                // Wait for all new images to load before fading in
                const images = mainContent.querySelectorAll('img');
                const imageLoadPromises = [...images].map(img => {
                    return new Promise(resolve => {
                        if (img.complete) return resolve();
                        img.onload = () => resolve();
                        img.onerror = () => resolve(); // Don't let a broken image block the transition
                    });
                });
                await Promise.all(imageLoadPromises);
                mainContent.classList.remove('fade-out');
                // Re-initialize animations for the new content
                initPageAnimations();
                // Reset the flag after the transition is complete
                isTransitioning = false;
            }, { once: true }); // Important: listener runs only once
        } catch (error) {
            console.error('Failed to load page:', error);
            isTransitioning = false; // Also reset the flag on error
            window.location.href = url; // Fallback to normal navigation
        }
    };
    // Intercept all internal link clicks
    document.body.addEventListener('click', e => {
        const link = e.target.closest('a');
        // Check if it's an internal link and not a special link
        if (link && link.href.startsWith(window.location.origin) && !link.href.includes('#') && link.target !== '_blank') {
            e.preventDefault();
            const targetUrl = link.href;
            // Don't do anything if we're already on the page
            if (window.location.href === targetUrl) return;
            // Update URL in browser history and load the new page
            history.pushState({}, '', targetUrl);
            updateActiveNav(new URL(targetUrl).pathname);
            loadPage(targetUrl);
        }
    });
    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        updateActiveNav(window.location.pathname);
        loadPage(window.location.href);
    });
    // handle first page load smoothly
    const initializeFirstLoad = async () => {
        // Highlight the active link immediately
        updateActiveNav(window.location.pathname);
        // Wait for initial images to load before starting animations
        const initialImages = mainContent.querySelectorAll('img');
        const imageLoadPromises = [...initialImages].map(img => {
            return new Promise(resolve => {
                if (img.complete) return resolve();
                img.onload = () => resolve();
                img.onerror = () => resolve();
            });
        });
        await Promise.all(imageLoadPromises);
        // Now that images are ready, run the animations
        initPageAnimations();
    };
    // Run the initialization function
    initializeFirstLoad();
});