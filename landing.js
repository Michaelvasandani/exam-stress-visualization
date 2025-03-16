// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
  // Initialize scrollytelling
  initScrollama();
  
  // Hide all sections initially except the hero section
  document.querySelectorAll('.scroll-section:not(#intro)').forEach(section => {
    const timeIndicator = section.querySelector('.time-indicator');
    const heading = section.querySelector('h2');
    const character = section.querySelector('.character svg');
    const metricsOverlay = section.querySelector('.metrics-overlay');
    const narrativeText = section.querySelector('.narrative-text');
    
    if (timeIndicator) timeIndicator.style.opacity = 0;
    if (heading) heading.style.opacity = 0;
    if (character) {
      character.style.opacity = 0;
      character.style.transform = 'translateY(20px)';
    }
    if (metricsOverlay) {
      metricsOverlay.style.opacity = 0;
      metricsOverlay.style.transform = 'translate(10px, -50%)';
    }
    if (narrativeText) {
      narrativeText.style.opacity = 0;
      narrativeText.style.transform = 'translateY(20px)';
    }
  });
  
  // Hide explore section elements initially
  const exploreSection = document.querySelector('#explore');
  if (exploreSection) {
    const heading = exploreSection.querySelector('h2');
    const intro = exploreSection.querySelector('.explore-intro');
    const vizCards = exploreSection.querySelectorAll('.viz-card');
    const ctaContainer = exploreSection.querySelector('.cta-container');
    
    if (heading) {
      heading.style.opacity = 0;
      heading.style.transform = 'translateY(30px)';
    }
    if (intro) {
      intro.style.opacity = 0;
      intro.style.transform = 'translateY(30px)';
    }
    vizCards.forEach(card => {
      card.style.opacity = 0;
      card.style.transform = 'translateY(50px)';
    });
    if (ctaContainer) {
      ctaContainer.style.opacity = 0;
      ctaContainer.style.transform = 'translateY(30px)';
    }
  }
  
  // Handle mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const landingMenu = document.querySelector('.landing-menu');
  
  menuToggle.addEventListener('click', function() {
    landingMenu.classList.toggle('active');
    
    // Animate menu bars
    const bars = menuToggle.querySelectorAll('.bar');
    bars.forEach(bar => bar.classList.toggle('open'));
  });
  
  // Close menu when clicking a link
  const menuLinks = document.querySelectorAll('.landing-menu a');
  menuLinks.forEach(link => {
    link.addEventListener('click', function() {
      landingMenu.classList.remove('active');
      
      // Reset menu toggle icon
      const bars = menuToggle.querySelectorAll('.bar');
      bars.forEach(bar => bar.classList.remove('open'));
    });
  });
  
  // Smooth scroll for navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Handle navigation appearance on scroll
  const landingNav = document.querySelector('.landing-nav');
  let lastScrollPosition = 0;
  const scrollThreshold = 50; // Threshold for scroll detection
  
  window.addEventListener('scroll', function() {
    const currentScrollPosition = window.scrollY;
    
    // Add background when scrolled down
    if (currentScrollPosition > 50) {
      landingNav.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
      landingNav.classList.add('scrolled');
    } else {
      landingNav.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
      landingNav.classList.remove('scrolled');
    }
    
    // Only react to significant scroll changes
    if (Math.abs(currentScrollPosition - lastScrollPosition) < scrollThreshold) {
      return;
    }
    
    // Hide/show nav when scrolling down/up
    if (currentScrollPosition > lastScrollPosition && currentScrollPosition > 200) {
      // Scrolling down - hide the nav
      landingNav.style.transform = 'translateY(-100%)';
    } else if (currentScrollPosition < lastScrollPosition) {
      // Scrolling up - show the nav
      landingNav.style.transform = 'translateY(0)';
    }
    
    lastScrollPosition = currentScrollPosition;
  });
});

// Initialize scrollytelling
function initScrollama() {
  // Using Scrollama for scrollytelling
  const scroller = scrollama();
  
  scroller
    .setup({
      step: '.scroll-section',
      offset: 0.4, // Increased slightly to trigger animations earlier
      debug: false
    })
    .onStepEnter(response => {
      const { element, index, direction } = response;
      const sectionId = element.id;
      
      // Highlight active nav item
      document.querySelectorAll('.landing-menu a').forEach(link => {
        link.classList.remove('active');
      });
      
      let navTarget = sectionId;
      // Map 'midpoint' section to 'during-exam' in navigation
      if (sectionId === 'midpoint') {
        navTarget = 'during-exam';
      }
      
      const activeNavLink = document.querySelector(`.landing-menu a[href="#${navTarget}"]`);
      if (activeNavLink) {
        activeNavLink.classList.add('active');
      }
      
      // Animation based on section
      if (sectionId === 'intro') {
        animateHeroSection();
      } else if (['before-exam', 'during-exam', 'midpoint', 'after-exam'].includes(sectionId)) {
        animateNarrativeSection(response);
      } else if (sectionId === 'explore') {
        animateExploreSection(element);
      }
    })
    .onStepExit(response => {
      // Optionally handle exit animations here if needed
    });
  
  // Update Scrollama on window resize
  window.addEventListener('resize', scroller.resize);
}

// Animate the hero section
function animateHeroSection() {
  const heading = document.querySelector('.hero h1');
  const tagline = document.querySelector('.tagline');
  const ctaButton = document.querySelector('.cta-button');
  const scrollIndicator = document.querySelector('.scroll-indicator');
  
  // Reset animations - ensure elements start hidden
  if (heading) {
    heading.style.opacity = 0;
    heading.style.transform = 'translateY(30px)';
  }
  
  if (tagline) {
    tagline.style.opacity = 0;
    tagline.style.transform = 'translateY(30px)';
  }
  
  if (ctaButton) {
    ctaButton.style.opacity = 0;
    ctaButton.style.transform = 'translateY(30px)';
  }
  
  if (scrollIndicator) {
    scrollIndicator.style.opacity = 0;
  }
  
  // Animate elements sequentially with smooth transitions
  setTimeout(() => {
    if (heading) {
      heading.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
      heading.style.opacity = 1;
      heading.style.transform = 'translateY(0)';
    }
  }, 300);
  
  setTimeout(() => {
    if (tagline) {
      tagline.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
      tagline.style.opacity = 1;
      tagline.style.transform = 'translateY(0)';
    }
  }, 600);
  
  setTimeout(() => {
    if (ctaButton) {
      ctaButton.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
      ctaButton.style.opacity = 1;
      ctaButton.style.transform = 'translateY(0)';
    }
  }, 900);
  
  setTimeout(() => {
    if (scrollIndicator) {
      scrollIndicator.style.transition = 'opacity 1s ease';
      scrollIndicator.style.opacity = 0.7;
    }
  }, 1500);
}

// Function to animate the narrative sections (before/during/after exam)
function animateNarrativeSection(response) {
  let currentElement = response.element;
  let timeIndicator = currentElement.querySelector('.time-indicator');
  let heading = currentElement.querySelector('h2');
  let character = currentElement.querySelector('.character svg');
  let metricsOverlay = currentElement.querySelector('.metrics-overlay');
  let narrativeText = currentElement.querySelector('.narrative-text');
  
  // Reset animations
  if (timeIndicator) timeIndicator.style.opacity = 0;
  if (heading) heading.style.opacity = 0;
  if (character) {
    character.style.opacity = 0;
    character.style.transform = 'translateY(20px)';
  }
  if (metricsOverlay) {
    metricsOverlay.style.opacity = 0;
    metricsOverlay.style.transform = 'translate(10px, -50%)';
    
    // Make sure metric bars start at width 0
    const metricBars = metricsOverlay.querySelectorAll('.metric-bar');
    metricBars.forEach(bar => {
      // Store the target width as a data attribute if not already set
      if (!bar.dataset.targetWidth) {
        bar.dataset.targetWidth = bar.style.width || '70%';
      }
      bar.style.width = '0';
    });
  }
  if (narrativeText) {
    narrativeText.style.opacity = 0;
    narrativeText.style.transform = 'translateY(20px)';
  }
  
  // Animate in sequence with smooth transitions
  setTimeout(() => {
    if (timeIndicator) {
      timeIndicator.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      timeIndicator.style.opacity = 1;
    }
    
    setTimeout(() => {
      if (heading) {
        heading.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
        heading.style.opacity = 1;
      }
      
      setTimeout(() => {
        if (character) {
          character.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
          character.style.opacity = 1;
          character.style.transform = 'translateY(0)';
        }
        
        setTimeout(() => {
          if (metricsOverlay) {
            metricsOverlay.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            metricsOverlay.style.opacity = 1;
            metricsOverlay.style.transform = 'translate(0, -50%)';
            
            // Animate individual metrics with a delay
            const metricBars = metricsOverlay.querySelectorAll('.metric-bar');
            metricBars.forEach((bar, index) => {
              setTimeout(() => {
                bar.style.transition = 'width 1.2s ease-out';
                bar.style.width = bar.dataset.targetWidth;
              }, index * 250);
            });
          }
          
          setTimeout(() => {
            if (narrativeText) {
              narrativeText.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
              narrativeText.style.opacity = 1;
              narrativeText.style.transform = 'translateY(0)';
            }
          }, 400);
        }, 300);
      }, 250);
    }, 250);
  }, 250);
}

// Animate the explore data section
function animateExploreSection(element) {
  const heading = element.querySelector('h2');
  const intro = element.querySelector('.explore-intro');
  const vizCards = element.querySelectorAll('.viz-card');
  const ctaContainer = element.querySelector('.cta-container');
  
  // Reset animations to ensure elements start hidden
  if (heading) {
    heading.style.opacity = 0;
    heading.style.transform = 'translateY(30px)';
  }
  
  if (intro) {
    intro.style.opacity = 0;
    intro.style.transform = 'translateY(30px)';
  }
  
  vizCards.forEach(card => {
    card.style.opacity = 0;
    card.style.transform = 'translateY(40px)';
  });
  
  if (ctaContainer) {
    ctaContainer.style.opacity = 0;
    ctaContainer.style.transform = 'translateY(30px)';
  }
  
  // Animate heading with delay
  setTimeout(() => {
    if (heading) {
      heading.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
      heading.style.opacity = 1;
      heading.style.transform = 'translateY(0)';
    }
  }, 250);
  
  // Animate intro with delay
  setTimeout(() => {
    if (intro) {
      intro.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
      intro.style.opacity = 1;
      intro.style.transform = 'translateY(0)';
    }
  }, 500);
  
  // Animate cards with a staggered delay
  vizCards.forEach((card, index) => {
    setTimeout(() => {
      card.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      card.style.opacity = 1;
      card.style.transform = 'translateY(0)';
    }, 800 + (index * 200));
  });
  
  // Animate CTA
  setTimeout(() => {
    if (ctaContainer) {
      ctaContainer.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
      ctaContainer.style.opacity = 1;
      ctaContainer.style.transform = 'translateY(0)';
    }
  }, 800 + (vizCards.length * 200) + 200);
}

// Add interactivity to the visualization cards on hover
document.addEventListener('DOMContentLoaded', function() {
  const vizCards = document.querySelectorAll('.viz-card');
  
  vizCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      const icon = this.querySelector('.viz-icon');
      if (icon) {
        icon.style.transform = 'scale(1.1) rotate(5deg)';
      }
    });
    
    card.addEventListener('mouseleave', function() {
      const icon = this.querySelector('.viz-icon');
      if (icon) {
        icon.style.transform = 'scale(1) rotate(0)';
      }
    });
  });
  
  // Initialize with animations for the first section
  setTimeout(() => {
    const firstSection = document.querySelector('.scroll-section');
    if (firstSection) {
      firstSection.classList.add('active');
      animateSection(firstSection, 'down');
    }
  }, 500);
}); 