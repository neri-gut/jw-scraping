from setuptools import setup, find_packages

setup(
    name="jw-meeting-api",
    version="1.0.0",
    description="Python client for the JW Meeting Content API",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Auto-generated",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
    ],
    python_requires=">=3.7",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
)