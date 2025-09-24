import React from 'react';

const Privacy = ({ darkMode }) => {
  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3">Introduction</h2>
          <p>
            When you use our services, you're trusting us with your information. We understand this is a big responsibility and work hard to protect your information and put you in control.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Information We Collect</h2>
          <p>
            We collect information to provide better services to all our users — from figuring out basic stuff like which language you speak, to more complex things like which ads you'll find most useful or the people who matter most to you online.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">How We Use Information</h2>
          <p>
            We use the information we collect from all our services for the following purposes:
          </p>
          <ul className={`list-disc pl-6 mt-2 space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <li>Provide and improve our services</li>
            <li>Develop new services</li>
            <li>Provide personalized services</li>
            <li>Measure performance</li>
            <li>Communicate with you</li>
            <li>Protect Google and our users</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Transparency and Choice</h2>
          <p>
            People have different privacy concerns. Our goal is to be clear about what information we collect, so that you can make meaningful choices about how it is used.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
