import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Inter } from 'next/font/google';
import { Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle } from "flowbite-react";
import Link from "next/link";
import { Card, Alert } from "flowbite-react";
import { Button, Label, TextInput } from "flowbite-react";
import { authApi } from '../services/api';

const inter = Inter({ subsets: ['latin'] })

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is already authenticated
  useEffect(() => {
    if (authApi.isAuthenticated()) {
      router.push('/structure');
    }
  }, [router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authApi.register(formData);
      
      if (result.success) {
        router.push('/structure');
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar fluid rounded>
        <NavbarBrand>
          <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">Home</span>
        </NavbarBrand>
        <NavbarToggle />
        <NavbarCollapse>
          <NavbarLink as={Link} href="/">Login</NavbarLink>
          <NavbarLink as={Link} href="/register">Register</NavbarLink>
        </NavbarCollapse>
      </Navbar>
      
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Card className="w-md">
          <h2 className="text-2xl font-bold text-center mb-4">Register</h2>
          
          {error && (
            <Alert color="failure" className="mb-4">
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleRegister} className="flex max-w-md flex-col gap-4">
            <div>
              <div className="mb-2 block">
                <Label htmlFor="name">Name</Label>
              </div>
              <TextInput 
                id="name" 
                name="name"
                type="text" 
                placeholder="Full Name" 
                required 
                value={formData.name}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="username">Username</Label>
              </div>
              <TextInput 
                id="username" 
                name="username"
                type="text" 
                placeholder="username" 
                required 
                value={formData.username}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="password">Password</Label>
              </div>
              <TextInput 
                id="password" 
                name="password"
                type="password" 
                required 
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </Button>
            <Link href="/">
              <Button color="gray" className="w-full">
                Login
              </Button>
            </Link>
          </form>
        </Card>
      </div>  
    </>
  );
}
