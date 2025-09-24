import React from 'react';

const Terms = ({ darkMode }) => {
  return (
    <article className={`max-w-4xl mx-auto px-4 py-8 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-2">Welcome to Google</h2>
          <p>
            Thanks for using our products and services ("Services"). The Services are provided by Google LLC ("Google"), located at 1600 Amphitheatre Parkway, Mountain View, CA 94043, United States.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Using our Services</h2>
          <p>
            You must follow any policies made available to you within the Services. Don't misuse our Services. For example, don’t interfere with our Services or try to access them using a method other than the interface and instructions that we provide.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Privacy and Copyright Protection</h2>
          <p>
            Google's privacy policies explain how we treat your personal data and protect your privacy when you use our Services. By using our Services, you agree that Google can use such data in accordance with our privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Your Content in our Services</h2>
          <p>
            Some of our Services allow you to upload, submit, store, send, or receive content. You retain ownership of any intellectual property rights that you hold in that content. In short, what belongs to you stays yours.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Modifying and Terminating our Services</h2>
          <p>
            We are constantly changing and improving our Services. We may add or remove functionalities or features, and we may suspend or stop a Service altogether.
          </p>
        </section>
      </div>
    </article>
  );
};

export default Terms;
