// Add this file to handle dashboard functionality
document.addEventListener("DOMContentLoaded", () => {
  const auth = localStorage.getItem("user_auth");
  if (!auth) {
    window.location.href = "/";
    return;
  }

  // Display username in the header
  const userInfo = document.getElementById("userInfo");
  if (userInfo) {
    const userData = JSON.parse(auth);
    userInfo.textContent = `Welcome, ${userData.username}`;
  }

  // Image upload handling
  const dropZone = document.getElementById("dropZone");
  const imageInput = document.getElementById("image");
  const imagePreview = document.getElementById("imagePreview");
  const uploadPrompt = document.getElementById("uploadPrompt");
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  // Drag and drop handling
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-blue-500");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-blue-500");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-blue-500");
    const file = e.dataTransfer.files[0];
    handleImageUpload(file);
  });

  dropZone.addEventListener("click", () => {
    imageInput.click();
  });

  imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    handleImageUpload(file);
  });

  function handleImageUpload(file) {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      alert("File size must be less than 10MB");
      return;
    }

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.classList.remove("hidden");
      uploadPrompt.classList.add("hidden");
    };
    reader.readAsDataURL(file);
  }

  // Form submission
  const uploadForm = document.getElementById("uploadForm");
  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData();

      // Add the image file
      const imageFile = document.getElementById("image").files[0];
      if (!imageFile) {
        alert("Please select an image");
        return;
      }
      formData.append("image", imageFile);

      // Add other form data
      formData.append("keywords", document.getElementById("keywords").value);
      formData.append("language", document.getElementById("language").value);

      try {
        // Show loading state
        document.getElementById("loadingState").classList.remove("hidden");
        document.getElementById("descriptionResult").classList.add("hidden");

        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${JSON.parse(auth).token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Upload failed: ${response.statusText}`
          );
        }

        const result = await response.json();

        // Format the description text
        const formattedDescription = formatDescription(result.description);

        // Update UI with results
        document.getElementById("loadingState").classList.add("hidden");
        document.getElementById("descriptionResult").classList.remove("hidden");
        document.getElementById("generatedTitle").textContent =
          result.title || "";
        document.getElementById("generatedDescription").innerHTML =
          formattedDescription;
        document.getElementById("generatedKeywords").textContent =
          result.keywords || "";
      } catch (error) {
        console.error("Error:", error);
        alert(error.message || "Upload failed. Please try again.");
        document.getElementById("loadingState").classList.add("hidden");
      }
    });
  }

  // Function to format description text
  function formatDescription(text) {
    if (!text) return "";

    // Remove the '''T markers that appear before bullet points
    text = text.replace(/'''T\s*/g, "• ");
    text = text.replace(/'''T/g, "•");

    // Replace markdown headings with HTML
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Replace markdown lists with HTML
    text = text.replace(/- (.*?):/g, "<br><strong>- $1:</strong>");
    text = text.replace(/- (.*?)$/gm, "<br>• $1");

    // Replace paragraph breaks
    text = text.replace(/\n\n/g, "<br><br>");
    text = text.replace(/\n/g, "<br>");

    // Replace sections
    text = text.replace(/---/g, "<hr>");

    return text;
  }

  // Add event listener for the download button
  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", generatePDF);
  }

  // Function to generate and download PDF
  function generatePDF() {
    try {
      // Get the content to be included in the PDF
      const title = document.getElementById("generatedTitle").innerText;
      const description = document.getElementById(
        "generatedDescription"
      ).innerHTML;
      const keywords = document.getElementById("generatedKeywords").innerText;
      const productImage = document.getElementById("imagePreview").src;

      // Initialize jsPDF
      const { jsPDF } = window.jspdf;
      if (!jsPDF) {
        throw new Error("jsPDF library not loaded properly");
      }

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Add a styled header with logo
      doc.setFillColor(65, 105, 225); // Royal blue header
      doc.rect(0, 0, 210, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("ProDescribe AI", 15, 15);
      doc.setFontSize(12);
      doc.text("Product Description Generator", 105, 15, { align: "center" });

      // Add date on the header
      const date = new Date().toLocaleDateString();
      doc.setFontSize(10);
      doc.text(`Generated: ${date}`, 195, 15, { align: "right" });

      // Reset text color for content
      doc.setTextColor(0, 0, 0);

      // Add product image if available
      if (productImage && !productImage.includes("undefined")) {
        try {
          doc.addImage(productImage, "JPEG", 15, 35, 60, 60, undefined, "FAST");
          // Add a border around the image
          doc.setDrawColor(200, 200, 200);
          doc.rect(15, 35, 60, 60);
        } catch (e) {
          console.error("Error adding image to PDF:", e);
        }
      }

      // Add title section with background
      doc.setFillColor(240, 240, 240);
      doc.rect(15, 105, 180, 15, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Product Title", 20, 115);

      // Add title content
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const titleLines = doc.splitTextToSize(title, 170);
      doc.text(titleLines, 20, 125);

      // Add description section with background
      let yPos = 130 + titleLines.length * 7;
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPos, 180, 15, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Product Description", 20, yPos + 10);

      // Process description content with proper formatting
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);

      // Create a temporary div to parse HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = description;

      // Process the HTML to maintain bullet points and formatting
      let processedText = "";
      const paragraphs = tempDiv.innerHTML.split("<br>");

      // Start position for description text
      let textYPos = yPos + 20;
      const leftMargin = 20;
      const rightMargin = 190;
      const lineHeight = 7;

      // Process each paragraph
      paragraphs.forEach((paragraph) => {
        // Skip empty paragraphs
        if (paragraph.trim() === "") return;

        // Clean the paragraph of HTML tags
        let cleanParagraph = paragraph.replace(/<\/?[^>]+(>|$)/g, "").trim();

        // Check if it's a bullet point
        if (cleanParagraph.startsWith("•")) {
          // Format as bullet point with proper indentation
          const bulletText = cleanParagraph.substring(1).trim();
          const bulletLines = doc.splitTextToSize(bulletText, 160); // Narrower width for bullets

          // Add bullet point
          doc.text("•", leftMargin, textYPos);
          // Add bullet text with indent
          doc.text(bulletLines, leftMargin + 5, textYPos);

          // Move position for next paragraph
          textYPos += lineHeight * bulletLines.length;
        } else {
          // Regular paragraph
          const paragraphLines = doc.splitTextToSize(cleanParagraph, 170);
          doc.text(paragraphLines, leftMargin, textYPos);

          // Move position for next paragraph
          textYPos += lineHeight * paragraphLines.length;
        }

        // Add extra space between paragraphs
        textYPos += 2;

        // Check if we need a new page
        if (textYPos > 270) {
          doc.addPage();
          textYPos = 20;
        }
      });

      // Update yPos for keywords section
      yPos = textYPos + 10;

      // Add keywords section with background
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPos, 180, 15, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("SEO Keywords", 20, yPos + 10);

      // Process keywords with proper formatting
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);

      // Split keywords by commas and format as bullet points
      const keywordsList = keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k);
      let keywordYPos = yPos + 20;

      keywordsList.forEach((keyword, index) => {
        // Format as bullet points
        doc.text("•", leftMargin, keywordYPos);
        doc.text(keyword, leftMargin + 5, keywordYPos);
        keywordYPos += lineHeight;

        // Check if we need a new page
        if (keywordYPos > 270) {
          doc.addPage();
          keywordYPos = 20;
        }
      });

      // Add footer on the last page
      doc.setDrawColor(65, 105, 225);
      doc.line(15, 280, 195, 280);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Generated by ProDescribe AI - Smart Product Description Generator",
        105,
        287,
        { align: "center" }
      );
      doc.text("www.prodescribe.ai", 105, 292, { align: "center" });

      // Save the PDF
      doc.save("product-description.pdf");

      console.log("PDF generated successfully");
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF. Error: " + error.message);
    }
  }
});
