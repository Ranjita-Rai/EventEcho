//wait for the DOM to be fully loaded
window.addEventListener('DOMContentLoaded', () => {
    //function to replace the text content of an element
    const replaceText = (selector, text) => {
      //find the element with the given selector id
      const element = document.getElementById(selector);
      //if the element exists , set its inner text to the provided text
      if (element) element.innerText = text;
    };
  
    for (const type of ['chrome', 'node', 'electron']) {
      //replace the text content of the element with the id of the current type
      replaceText(`${type}-version`, process.versions[type]);
    }
  });
  
