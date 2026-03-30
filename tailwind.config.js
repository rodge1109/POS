/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Data Tables - Roboto, Inter, IBM Plex Sans
        'data-table': ['Roboto', 'Inter', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        // Dashboards - Inter, Lato, Montserrat
        'dashboard': ['Inter', 'Lato', 'Montserrat', 'system-ui', 'sans-serif'],
        // Cards/Layouts - Poppins, Open Sans, Proxima Nova
        'card': ['Poppins', 'Open Sans', 'system-ui', 'sans-serif'],
        // Admin Panels - Source Sans Pro, Helvetica, Arial
        'admin': ['Source Sans Pro', 'Helvetica', 'Arial', 'system-ui', 'sans-serif'],
        // Product Grids - Montserrat, Poppins, Quicksand
        'product': ['Montserrat', 'Poppins', 'Quicksand', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

